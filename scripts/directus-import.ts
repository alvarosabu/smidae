/**
 * CLI product importer — scrape a product URL, extract with an LLM, create a
 * Directus draft. Shares the same core (`lib/import`) as the /api/import route.
 *
 * Usage:  pnpm import <url> [<url> ...]
 */

import 'dotenv/config'
import { createDirectus, rest, staticToken } from '@directus/sdk'
import { runImport, ImportError } from '../lib/import'

const url = process.env.PUBLIC_URL ?? 'http://localhost:8055'
const adminToken = process.env.ADMIN_TOKEN
const apiKey = process.env.ANTHROPIC_API_KEY
const model = process.env.IMPORT_MODEL ?? 'claude-haiku-4-5'

if (!adminToken) throw new Error('ADMIN_TOKEN required (set in .env)')
if (!apiKey) throw new Error('ANTHROPIC_API_KEY required (set in .env)')

const urls = process.argv.slice(2)
if (!urls.length) {
  console.error('Usage: pnpm import <url> [<url> ...]')
  process.exit(1)
}

const client = createDirectus(url).with(rest()).with(staticToken(adminToken))

async function main(): Promise<void> {
  for (const target of urls) {
    console.log(`\n› ${target}`)
    try {
      const r = await runImport({ url: target, apiKey: apiKey!, model, client })
      const verb = r.created ? 'created' : 'skipped (exists)'
      console.log(`  ✓ ${verb}: ${r.slug} (${r.id})`)
      console.log(`    category: ${r.category ?? '—'} · tags: ${r.tagCount} · datasheets: ${r.datasheetCount} · images: ${r.imageCount}`)
      for (const w of r.warnings) console.log(`    ! ${w}`)
    } catch (err) {
      const msg = err instanceof ImportError ? `[${err.status}] ${err.message}` : (err as Error).message
      console.error(`  ✗ ${msg}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
