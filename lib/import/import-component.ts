import type { ExtractedComponent } from './schema'

/**
 * The Directus operations importComponent needs, as a narrow port. The real
 * implementation (createDirectusOps) wraps a Directus SDK client; tests pass a
 * fake. Keeps the write logic unit-testable without mocking the SDK command layer.
 */
export interface DirectusOps {
  findComponentBySlug(slug: string): Promise<{ id: string, slug: string } | null>
  findCategory(name: string): Promise<{ id: string } | null>
  createCategory(input: { name: string, slug: string }): Promise<{ id: string }>
  findTag(name: string): Promise<{ id: string } | null>
  createTag(name: string): Promise<{ id: string }>
  importFileFromUrl(url: string, title: string): Promise<{ id: string }>
  createComponent(payload: Record<string, unknown>): Promise<{ id: string, slug: string }>
}

export interface ImportComponentInput {
  data: ExtractedComponent
  sourceUrl: string
  ops: DirectusOps
  /** Returns the response content-type for a candidate file URL (or null on failure). */
  probeContentType: (url: string) => Promise<string | null>
}

export interface ImportResult {
  id: string
  slug: string
  created: boolean
  category: string | null
  tagCount: number
  datasheetCount: number
  imageCount: number
  warnings: string[]
  sourceUrl: string
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function importComponent(input: ImportComponentInput): Promise<ImportResult> {
  const { data, sourceUrl, ops, probeContentType } = input
  const warnings: string[] = []
  const slug = slugify(data.name)

  const existing = await ops.findComponentBySlug(slug)
  if (existing) {
    return {
      id: existing.id,
      slug: existing.slug,
      created: false,
      category: null,
      tagCount: 0,
      datasheetCount: 0,
      imageCount: 0,
      warnings: [`Component "${slug}" already exists — skipped.`],
      sourceUrl
    }
  }

  // Category: reuse by name, else create.
  let categoryId: string | null = null
  if (data.category) {
    const found = await ops.findCategory(data.category)
    categoryId = found?.id ?? (await ops.createCategory({ name: data.category, slug: slugify(data.category) })).id
  }

  // Tags: reuse by name, else create.
  const tagIds: string[] = []
  for (const name of data.tags) {
    const found = await ops.findTag(name)
    tagIds.push((found ?? (await ops.createTag(name))).id)
  }

  // Files are best-effort: a content-type mismatch OR a Directus import failure
  // becomes a warning and never aborts the draft creation.
  const importFile = async (url: string, label: string, accept: (type: string) => boolean): Promise<string | null> => {
    const type = await probeContentType(url)
    if (!type || !accept(type)) {
      warnings.push(`Skipped ${label} ${url} (content-type ${type ?? 'unknown'}).`)
      return null
    }
    try {
      return (await ops.importFileFromUrl(url, `${data.name} — ${label === 'datasheet' ? 'Datasheet' : 'Image'}`)).id
    } catch (err) {
      warnings.push(`Could not import ${label} ${url}: ${(err as Error).message}`)
      return null
    }
  }

  const datasheetIds: string[] = []
  for (const url of data.datasheetUrls) {
    const id = await importFile(url, 'datasheet', t => t.includes('application/pdf'))
    if (id) datasheetIds.push(id)
  }

  const imageIds: string[] = []
  for (const url of data.imageUrls) {
    const id = await importFile(url, 'image', t => t.startsWith('image/'))
    if (id) imageIds.push(id)
  }

  const payload: Record<string, unknown> = {
    status: 'draft',
    availability: data.availability,
    name: data.name,
    slug,
    manufacturer: data.manufacturer,
    part_number: data.part_number,
    quantity: 1,
    overview: data.overview,
    features: data.features.length ? data.features : null,
    specs: data.specs.length ? data.specs : null,
    category: categoryId,
    tags: tagIds.map(id => ({ tags_id: id })),
    datasheets: datasheetIds.map(id => ({ directus_files_id: id })),
    gallery: imageIds.map(id => ({ directus_files_id: id })),
    thumbnail: imageIds[0] ?? null
  }

  const created = await ops.createComponent(payload)
  return {
    id: created.id,
    slug: created.slug,
    created: true,
    category: data.category || null,
    tagCount: tagIds.length,
    datasheetCount: datasheetIds.length,
    imageCount: imageIds.length,
    warnings,
    sourceUrl
  }
}
