/**
 * Idempotently create the "Import from URL" Directus Flow: a manual-trigger
 * button on the components collection that collects a URL and POSTs it to the
 * Nuxt /api/import endpoint with the shared secret.
 *
 * Run with:  pnpm directus:import:flow
 *
 * Env: ADMIN_TOKEN, IMPORT_SECRET, SITE_URL (default http://localhost:3000),
 *      PUBLIC_URL (Directus, default http://localhost:8055).
 */

import 'dotenv/config'
import {
  createDirectus, rest, staticToken,
  createFlow, createOperation, readFlows, updateFlow
} from '@directus/sdk'

const directusUrl = process.env.PUBLIC_URL ?? 'http://localhost:8055'
const adminToken = process.env.ADMIN_TOKEN
const secret = process.env.IMPORT_SECRET
const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'

if (!adminToken) throw new Error('ADMIN_TOKEN required (set in .env)')
if (!secret) throw new Error('IMPORT_SECRET required (set in .env)')

const client = createDirectus(directusUrl).with(rest()).with(staticToken(adminToken))

const FLOW_NAME = 'Import from URL'

async function main(): Promise<void> {
  const existing = await client.request(readFlows({
    filter: { name: { _eq: FLOW_NAME } } as never,
    limit: 1
  }))
  if (existing.length) {
    console.log(`• skip flow "${FLOW_NAME}" (exists)`)
    return
  }

  const flow = await client.request(createFlow({
    name: FLOW_NAME,
    icon: 'download',
    color: '#6644FF',
    status: 'active',
    trigger: 'manual',
    accountability: 'all',
    options: {
      collections: ['components'],
      location: 'collection',
      requireConfirmation: true,
      requireSelection: false,
      fields: [
        {
          field: 'url',
          type: 'string',
          name: 'Product URL',
          meta: {
            interface: 'input',
            width: 'full',
            required: true,
            options: { placeholder: 'https://docs.arduino.cc/hardware/...' }
          }
        }
      ]
    }
  } as never)) as { id: string }
  console.log(`✓ created flow ${flow.id}`)

  const op = await client.request(createOperation({
    flow: flow.id,
    key: 'import_request',
    type: 'request',
    name: 'POST /api/import',
    position_x: 19,
    position_y: 1,
    options: {
      method: 'POST',
      url: `${siteUrl}/api/import`,
      headers: [
        { header: 'x-import-secret', value: secret },
        { header: 'Content-Type', value: 'application/json' }
      ],
      body: JSON.stringify({ url: '{{$trigger.body.url}}' })
    }
  } as never)) as { id: string }
  console.log(`✓ created request operation ${op.id}`)

  await client.request(updateFlow(flow.id, { operation: op.id } as never))
  console.log('✓ linked operation to flow trigger')

  console.log('\nFlow ready. In the components collection, the "Import from URL" button runs it.')
  console.log('NOTE: verify the URL field maps to {{$trigger.body.url}} in the operation\'s')
  console.log('Request Body (Directus manual-trigger payload shape can vary by version).')
}

main().catch((err) => {
  console.error('\nflow bootstrap failed:')
  console.error((err as { errors?: unknown }).errors ?? err)
  process.exit(1)
})
