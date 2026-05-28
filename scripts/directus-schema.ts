/**
 * Schema-as-code bootstrap for the Smidae Directus instance.
 *
 * Idempotent: re-running detects existing collections/fields/relations/
 * permissions and skips them. Uses `@directus/sdk` REST commands with the
 * static admin token from `.env`.
 *
 * Run with:  pnpm directus:schema:bootstrap
 */

import 'dotenv/config'
import {
  createCollection,
  createDirectus,
  createField,
  createPermission,
  createRelation,
  isDirectusError,
  readCollections,
  readFields,
  readPermissions,
  readPolicies,
  readRelations,
  rest,
  staticToken,
} from '@directus/sdk'

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

const url = process.env.PUBLIC_URL ?? 'http://localhost:8055'
const token = process.env.ADMIN_TOKEN
if (!token) throw new Error('ADMIN_TOKEN required (set in .env)')

const client = createDirectus(url).with(rest()).with(staticToken(token))

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

const log = {
  step: (msg: string) => console.log(`\n› ${msg}`),
  ok: (msg: string) => console.log(`  ✓ ${msg}`),
  skip: (msg: string) => console.log(`  • skip ${msg}`),
  warn: (msg: string) => console.warn(`  ! ${msg}`),
}

function isDuplicateError(err: unknown): boolean {
  if (isDirectusError(err)) {
    const errs = (err as { errors?: Array<{ extensions?: { code?: string } }> }).errors ?? []
    const code = errs[0]?.extensions?.code
    return code === 'RECORD_NOT_UNIQUE' || code === 'INVALID_PAYLOAD'
  }
  // Fallback: status 400 from Directus typically means already exists in schema ops.
  return false
}

// ---------------------------------------------------------------------------
// Existence caches (populated lazily)
// ---------------------------------------------------------------------------

let existingCollections: Set<string> | null = null
const existingFieldsByCollection = new Map<string, Set<string>>()
let existingRelations: Array<{ collection: string, field: string }> | null = null

async function loadExistingCollections(): Promise<Set<string>> {
  if (!existingCollections) {
    const cols = await client.request(readCollections())
    existingCollections = new Set(cols.map(c => c.collection))
  }
  return existingCollections
}

async function loadExistingFields(collection: string): Promise<Set<string>> {
  let set = existingFieldsByCollection.get(collection)
  if (!set) {
    try {
      const fields = await client.request(readFields(collection))
      set = new Set(fields.map(f => f.field))
    }
    catch {
      set = new Set()
    }
    existingFieldsByCollection.set(collection, set)
  }
  return set
}

async function loadExistingRelations(): Promise<Array<{ collection: string, field: string }>> {
  if (!existingRelations) {
    const rels = await client.request(readRelations())
    existingRelations = rels.map(r => ({ collection: r.collection, field: r.field }))
  }
  return existingRelations
}

// ---------------------------------------------------------------------------
// Schema primitives
// ---------------------------------------------------------------------------

async function ensureCollection(
  collection: string,
  opts: {
    icon?: string
    note?: string
    hidden?: boolean
    sort?: number
    sortField?: string | null
    archiveField?: string | null
    archiveValue?: string | null
    unarchiveValue?: string | null
  } = {},
): Promise<void> {
  const existing = await loadExistingCollections()
  if (existing.has(collection)) {
    log.skip(`collection ${collection}`)
    return
  }

  // Create with a primary UUID `id` field (Directus convention).
  await client.request(
    createCollection({
      collection,
      meta: {
        icon: opts.icon ?? null,
        note: opts.note ?? null,
        hidden: opts.hidden ?? false,
        sort_field: opts.sortField ?? null,
        archive_field: opts.archiveField ?? null,
        archive_value: opts.archiveValue ?? null,
        unarchive_value: opts.unarchiveValue ?? null,
      },
      schema: {
        name: collection,
        comment: null,
      },
      // Primary key: a UUID `id` field auto-populated by Directus.
      fields: [
        {
          field: 'id',
          type: 'uuid',
          meta: {
            hidden: true,
            readonly: true,
            interface: 'input',
            special: ['uuid'],
          },
          schema: {
            is_primary_key: true,
            has_auto_increment: false,
            is_nullable: false,
          },
        } as never,
      ],
    }),
  )
  existing.add(collection)
  existingFieldsByCollection.set(collection, new Set(['id']))
  log.ok(`created collection ${collection}`)
}

type FieldDef = {
  field: string
  type: string
  required?: boolean
  unique?: boolean
  nullable?: boolean
  defaultValue?: unknown
  interface?: string
  special?: string[]
  options?: Record<string, unknown>
  display?: string
  displayOptions?: Record<string, unknown>
  note?: string
  maxLength?: number | null
  /**
   * If set, the column will be a foreign key to `{ table, column }`. A relation
   * is created separately via `ensureRelation`.
   */
  foreign?: { table: string, column: string }
}

async function ensureField(collection: string, def: FieldDef): Promise<void> {
  const fields = await loadExistingFields(collection)
  if (fields.has(def.field)) {
    log.skip(`${collection}.${def.field}`)
    return
  }

  const schema: Record<string, unknown> = {
    is_nullable: def.nullable ?? !def.required,
    default_value: def.defaultValue ?? null,
    is_unique: def.unique ?? false,
  }
  if (def.maxLength !== undefined) schema.max_length = def.maxLength
  if (def.foreign) {
    schema.foreign_key_table = def.foreign.table
    schema.foreign_key_column = def.foreign.column
  }

  try {
    await client.request(
      createField(collection, {
        field: def.field,
        type: def.type,
        meta: {
          interface: def.interface ?? null,
          special: def.special ?? null,
          options: def.options ?? null,
          display: def.display ?? null,
          display_options: def.displayOptions ?? null,
          required: def.required ?? false,
          note: def.note ?? null,
        },
        schema: schema as never,
      }),
    )
    fields.add(def.field)
    log.ok(`field ${collection}.${def.field}`)
  }
  catch (err) {
    if (isDuplicateError(err)) {
      fields.add(def.field)
      log.skip(`${collection}.${def.field} (existed)`)
      return
    }
    throw err
  }
}

async function ensureRelation(item: {
  collection: string
  field: string
  related_collection: string
  meta?: Record<string, unknown>
  schema?: Record<string, unknown>
}): Promise<void> {
  const rels = await loadExistingRelations()
  if (rels.some(r => r.collection === item.collection && r.field === item.field)) {
    log.skip(`relation ${item.collection}.${item.field} → ${item.related_collection}`)
    return
  }

  try {
    await client.request(
      createRelation({
        collection: item.collection,
        field: item.field,
        related_collection: item.related_collection,
        meta: (item.meta ?? {}) as never,
        schema: (item.schema ?? {
          on_delete: 'SET NULL',
        }) as never,
      }),
    )
    rels.push({ collection: item.collection, field: item.field })
    log.ok(`relation ${item.collection}.${item.field} → ${item.related_collection}`)
  }
  catch (err) {
    if (isDuplicateError(err)) {
      rels.push({ collection: item.collection, field: item.field })
      log.skip(`relation ${item.collection}.${item.field} (existed)`)
      return
    }
    throw err
  }
}

/**
 * Create a Many-to-Many between `collection.field` and `relatedCollection`
 * using a junction table named `junction`. Mirrors what the Directus admin UI
 * does when adding an M2M alias field.
 */
async function ensureM2M(opts: {
  collection: string // 'components'
  field: string // 'tags'        (alias on parent)
  relatedCollection: string // 'tags'
  junction: string // 'components_tags'
  junctionThisColumn?: string // defaults to `${collection}_id`
  junctionRelatedColumn?: string // defaults to `${relatedCollection}_id`
}): Promise<void> {
  const {
    collection,
    field,
    relatedCollection,
    junction,
  } = opts
  const thisCol = opts.junctionThisColumn ?? `${collection}_id`
  const relCol = opts.junctionRelatedColumn ?? `${relatedCollection}_id`

  log.step(`M2M ${collection}.${field} ⇄ ${relatedCollection} via ${junction}`)

  // 1. Junction collection with its own UUID PK.
  await ensureCollection(junction, { hidden: true, icon: 'import_export' })

  // 2. FK columns on the junction.
  await ensureField(junction, {
    field: thisCol,
    type: 'uuid',
    nullable: true,
    foreign: { table: collection, column: 'id' },
  })
  await ensureField(junction, {
    field: relCol,
    type: 'uuid',
    nullable: true,
    foreign: { table: relatedCollection, column: 'id' },
  })

  // 3. Relations: each FK column on the junction → its target.
  await ensureRelation({
    collection: junction,
    field: thisCol,
    related_collection: collection,
    meta: {
      one_field: field, // alias on parent
      junction_field: relCol,
      sort_field: null,
    },
    schema: { on_delete: 'CASCADE' },
  })
  await ensureRelation({
    collection: junction,
    field: relCol,
    related_collection: relatedCollection,
    meta: {
      one_field: null,
      junction_field: thisCol,
      sort_field: null,
    },
    schema: { on_delete: 'CASCADE' },
  })

  // 4. Alias field on parent so the M2M shows up in queries / admin UI.
  await ensureField(collection, {
    field,
    type: 'alias',
    special: ['m2m'],
    interface: 'list-m2m',
    options: { template: '{{name}}' },
  })
}

// ---------------------------------------------------------------------------
// Status helpers (shared by components + tutorials)
// ---------------------------------------------------------------------------

async function ensureStatusField(collection: string): Promise<void> {
  await ensureField(collection, {
    field: 'status',
    type: 'string',
    required: true,
    defaultValue: 'draft',
    interface: 'select-dropdown',
    options: {
      choices: [
        { text: 'Draft', value: 'draft' },
        { text: 'Published', value: 'published' },
        { text: 'Archived', value: 'archived' },
      ],
    },
    display: 'labels',
    displayOptions: {
      showAsDot: true,
      choices: [
        { text: 'Draft', value: 'draft', foreground: '#FFFFFF', background: '#D3DAE4' },
        { text: 'Published', value: 'published', foreground: '#FFFFFF', background: '#2ECDA7' },
        { text: 'Archived', value: 'archived', foreground: '#FFFFFF', background: '#A2B5CD' },
      ],
    },
    nullable: false,
  })
}

async function ensureTimestamps(collection: string): Promise<void> {
  await ensureField(collection, {
    field: 'date_created',
    type: 'timestamp',
    nullable: true,
    interface: 'datetime',
    display: 'datetime',
    displayOptions: { relative: true },
    special: ['date-created'],
  })
  await ensureField(collection, {
    field: 'date_updated',
    type: 'timestamp',
    nullable: true,
    interface: 'datetime',
    display: 'datetime',
    displayOptions: { relative: true },
    special: ['date-updated'],
  })
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

async function bootstrapCategories(): Promise<void> {
  log.step('categories')
  await ensureCollection('categories', { icon: 'category', sortField: 'sort' })
  await ensureField('categories', { field: 'name', type: 'string', required: true, interface: 'input' })
  await ensureField('categories', { field: 'slug', type: 'string', required: true, unique: true, interface: 'input' })
  await ensureField('categories', { field: 'icon', type: 'string', nullable: true, interface: 'select-icon' })
  await ensureField('categories', { field: 'sort', type: 'integer', nullable: true, interface: 'input', options: { iconLeft: 'sort' } })
}

async function bootstrapTags(): Promise<void> {
  log.step('tags')
  await ensureCollection('tags', { icon: 'sell' })
  await ensureField('tags', { field: 'name', type: 'string', required: true, unique: true, interface: 'input' })
}

async function bootstrapComponents(): Promise<void> {
  log.step('components')
  await ensureCollection('components', {
    icon: 'memory',
    archiveField: 'status',
    archiveValue: 'archived',
    unarchiveValue: 'draft',
  })

  await ensureStatusField('components')
  await ensureTimestamps('components')

  await ensureField('components', { field: 'name', type: 'string', required: true, interface: 'input' })
  await ensureField('components', { field: 'slug', type: 'string', required: true, unique: true, interface: 'input' })

  // M2O → categories
  await ensureField('components', {
    field: 'category',
    type: 'uuid',
    nullable: true,
    interface: 'select-dropdown-m2o',
    options: { template: '{{name}}' },
    foreign: { table: 'categories', column: 'id' },
  })
  await ensureRelation({
    collection: 'components',
    field: 'category',
    related_collection: 'categories',
    schema: { on_delete: 'SET NULL' },
  })

  await ensureField('components', { field: 'manufacturer', type: 'string', nullable: true, interface: 'input' })
  await ensureField('components', { field: 'part_number', type: 'string', nullable: true, interface: 'input' })
  await ensureField('components', {
    field: 'quantity',
    type: 'integer',
    required: true,
    defaultValue: 0,
    interface: 'input',
    nullable: false,
  })
  await ensureField('components', { field: 'location', type: 'string', nullable: true, interface: 'input' })
  await ensureField('components', {
    field: 'overview',
    type: 'text',
    nullable: true,
    interface: 'input-rich-text-md',
  })
  await ensureField('components', {
    field: 'features',
    type: 'json',
    nullable: true,
    interface: 'list',
    options: {
      template: '{{ title }}',
      fields: [
        { field: 'title', name: 'Title', type: 'string', meta: { interface: 'input', width: 'full' } },
        { field: 'description', name: 'Description', type: 'text', meta: { interface: 'input-multiline', width: 'full' } },
        { field: 'icon', name: 'Icon', type: 'string', meta: { interface: 'select-icon', width: 'half' } },
      ],
    },
  })
  await ensureField('components', {
    field: 'specs',
    type: 'json',
    nullable: true,
    interface: 'list',
    options: {
      template: '{{ label }}: {{ value }}',
      fields: [
        { field: 'label', name: 'Label', type: 'string', meta: { interface: 'input', width: 'half' } },
        { field: 'value', name: 'Value', type: 'string', meta: { interface: 'input', width: 'half' } },
      ],
    },
  })

  // M2M gallery → directus_files (distinct junction).
  await ensureM2M({
    collection: 'components',
    field: 'gallery',
    relatedCollection: 'directus_files',
    junction: 'components_files',
  })

  // M2M datasheets → directus_files (distinct junction).
  await ensureM2M({
    collection: 'components',
    field: 'datasheets',
    relatedCollection: 'directus_files',
    junction: 'components_datasheets',
  })

  // M2M tags → tags.
  await ensureM2M({
    collection: 'components',
    field: 'tags',
    relatedCollection: 'tags',
    junction: 'components_tags',
  })
}

async function bootstrapTutorials(): Promise<void> {
  log.step('tutorials')
  await ensureCollection('tutorials', {
    icon: 'school',
    archiveField: 'status',
    archiveValue: 'archived',
    unarchiveValue: 'draft',
  })

  await ensureStatusField('tutorials')
  await ensureTimestamps('tutorials')

  await ensureField('tutorials', {
    field: 'date_published',
    type: 'timestamp',
    nullable: true,
    interface: 'datetime',
    display: 'datetime',
  })
  await ensureField('tutorials', { field: 'title', type: 'string', required: true, interface: 'input' })
  await ensureField('tutorials', { field: 'slug', type: 'string', required: true, unique: true, interface: 'input' })
  await ensureField('tutorials', { field: 'summary', type: 'text', nullable: true, interface: 'input-multiline' })

  // M2O → directus_files (cover)
  await ensureField('tutorials', {
    field: 'cover',
    type: 'uuid',
    nullable: true,
    interface: 'file-image',
    foreign: { table: 'directus_files', column: 'id' },
    special: ['file'],
  })
  await ensureRelation({
    collection: 'tutorials',
    field: 'cover',
    related_collection: 'directus_files',
    schema: { on_delete: 'SET NULL' },
  })

  await ensureField('tutorials', {
    field: 'content',
    type: 'text',
    nullable: true,
    interface: 'input-rich-text-md',
  })

  // M2M tutorials.components → components
  await ensureM2M({
    collection: 'tutorials',
    field: 'components',
    relatedCollection: 'components',
    junction: 'tutorials_components',
  })
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

async function getPublicPolicyId(): Promise<string> {
  // The Directus 11 admin UI assigns permissions to policies, not roles
  // directly. The auto-created "Public" policy has name `$t:public_label`.
  const policies = await client.request(readPolicies({ fields: ['id', 'name', 'admin_access', 'app_access'] }))
  const pub = policies.find(p => p.name === '$t:public_label' || p.name === 'Public')
  if (!pub) throw new Error('Public policy not found')
  return pub.id as string
}

type PermSpec = {
  collection: string
  action: 'read' | 'create' | 'update' | 'delete'
  fields?: string[]
  permissions?: Record<string, unknown>
}

async function ensurePermissions(policyId: string, specs: PermSpec[]): Promise<void> {
  log.step('public permissions')

  // Pre-load existing perms for this policy to keep idempotency cheap.
  const existing = await client.request(
    readPermissions({
      filter: { policy: { _eq: policyId } } as never,
      fields: ['id', 'collection', 'action'],
      limit: -1,
    }),
  )
  const existingKeys = new Set(existing.map(p => `${p.collection}::${p.action}`))

  for (const spec of specs) {
    const key = `${spec.collection}::${spec.action}`
    if (existingKeys.has(key)) {
      log.skip(`${spec.action} ${spec.collection}`)
      continue
    }
    try {
      await client.request(
        createPermission({
          policy: policyId,
          collection: spec.collection,
          action: spec.action,
          fields: spec.fields ?? ['*'],
          permissions: (spec.permissions ?? {}) as never,
          validation: {} as never,
          presets: null as never,
        }),
      )
      log.ok(`${spec.action} ${spec.collection}`)
    }
    catch (err) {
      if (isDuplicateError(err)) {
        log.skip(`${spec.action} ${spec.collection} (existed)`)
        continue
      }
      throw err
    }
  }
}

async function bootstrapPermissions(): Promise<void> {
  const publicPolicy = await getPublicPolicyId()
  const publishedOnly = { status: { _eq: 'published' } }

  await ensurePermissions(publicPolicy, [
    { collection: 'categories', action: 'read' },
    { collection: 'tags', action: 'read' },
    { collection: 'components', action: 'read', permissions: publishedOnly },
    { collection: 'tutorials', action: 'read', permissions: publishedOnly },
    { collection: 'directus_files', action: 'read' },
    { collection: 'components_files', action: 'read' },
    { collection: 'components_datasheets', action: 'read' },
    { collection: 'components_tags', action: 'read' },
    { collection: 'tutorials_components', action: 'read' },
  ])
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`directus-schema: bootstrapping against ${url}`)

  await bootstrapCategories()
  await bootstrapTags()
  await bootstrapComponents()
  await bootstrapTutorials()
  await bootstrapPermissions()

  console.log('\nschema bootstrap complete')
}

main().catch((err) => {
  console.error('\nschema bootstrap failed:')
  if (isDirectusError(err)) {
    const e = err as { errors?: unknown }
    console.error(JSON.stringify(e.errors ?? err, null, 2))
  }
  else {
    console.error(err)
  }
  process.exit(1)
})
