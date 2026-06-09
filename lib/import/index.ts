import { createItem, importFile, readItems } from '@directus/sdk'
import { scrape } from './scrape'
import { extract } from './extract'
import { importComponent, type DirectusOps, type ImportResult } from './import-component'

export type { ImportResult } from './import-component'
export type { ExtractedComponent } from './schema'

/** Carries an HTTP status so the API route can map it to a response code. */
export class ImportError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ImportError'
    this.status = status
  }
}

/** Minimum body text (chars) for a page to be considered scrapeable, not a bot/JS shell. */
const MIN_CONTENT_CHARS = 300

/** A Directus REST client (`createDirectus().with(rest()).with(staticToken())`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DirectusClient = { request: <T>(command: any) => Promise<T> }

/** Wire the DirectusOps port to a real Directus SDK client. */
export function createDirectusOps(client: DirectusClient): DirectusOps {
  return {
    async findComponentBySlug(slug) {
      const rows = await client.request<Array<{ id: string, slug: string }>>(
        readItems('components' as never, { filter: { slug: { _eq: slug } } as never, limit: 1, fields: ['id', 'slug'] as never })
      )
      return rows[0] ?? null
    },
    async findCategory(name) {
      const rows = await client.request<Array<{ id: string }>>(
        readItems('categories' as never, { filter: { name: { _eq: name } } as never, limit: 1, fields: ['id'] as never })
      )
      return rows[0] ?? null
    },
    async createCategory(input) {
      return client.request<{ id: string }>(createItem('categories' as never, input as never))
    },
    async findTag(name) {
      const rows = await client.request<Array<{ id: string }>>(
        readItems('tags' as never, { filter: { name: { _eq: name } } as never, limit: 1, fields: ['id'] as never })
      )
      return rows[0] ?? null
    },
    async createTag(name) {
      return client.request<{ id: string }>(createItem('tags' as never, { name } as never))
    },
    async importFileFromUrl(url, title) {
      return client.request<{ id: string }>(importFile(url, { title } as never))
    },
    async createComponent(payload) {
      return client.request<{ id: string, slug: string }>(createItem('components' as never, payload as never))
    }
  }
}

/** HEAD the URL (falling back to GET) to read its content-type. */
async function probeContentType(url: string, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    let res = await fetchImpl(url, { method: 'HEAD' })
    if (!res.ok || !res.headers.get('content-type')) {
      res = await fetchImpl(url, { method: 'GET' })
    }
    return res.headers.get('content-type')
  } catch {
    return null
  }
}

export interface RunImportInput {
  url: string
  apiKey: string
  model: string
  client?: DirectusClient
}

export interface RunImportDeps {
  fetchImpl?: typeof fetch
  ops?: DirectusOps
  extractImpl?: typeof extract
}

export async function runImport(input: RunImportInput, deps: RunImportDeps = {}): Promise<ImportResult> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const extractImpl = deps.extractImpl ?? extract
  const ops = deps.ops ?? (input.client ? createDirectusOps(input.client) : null)
  if (!ops) throw new ImportError('No Directus client provided', 500)

  let res: Response
  try {
    res = await fetchImpl(input.url, { redirect: 'follow' })
  } catch (err) {
    throw new ImportError(`Could not fetch ${input.url}: ${(err as Error).message}`, 502)
  }
  if (!res.ok) throw new ImportError(`Fetch failed (${res.status}) for ${input.url}`, 502)
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) {
    throw new ImportError(`${input.url} is not an HTML page (content-type: ${contentType || 'unknown'})`, 400)
  }

  const html = await res.text()
  const { text, candidateLinks, candidateImages } = scrape(html, input.url)

  // Guard against bot-check pages and JS-rendered shells: a plain server-side
  // fetch of those yields almost no body text, which would otherwise make the
  // model emit placeholder junk ("unknown product"). Fail clearly instead.
  if (text.length < MIN_CONTENT_CHARS) {
    throw new ImportError(
      `Too little extractable content at ${input.url} (${text.length} chars). The page is likely bot-protected or JavaScript-rendered (e.g. Amazon); try a manufacturer/distributor page that serves static HTML.`,
      422
    )
  }

  const data = await extractImpl({
    text,
    links: candidateLinks,
    images: candidateImages,
    apiKey: input.apiKey,
    model: input.model
  })
  if (!data.name?.trim()) {
    throw new ImportError('Extraction produced no product name; nothing created.', 422)
  }

  return importComponent({
    data,
    sourceUrl: input.url,
    ops,
    probeContentType: u => probeContentType(u, fetchImpl)
  })
}
