import { describe, it, expect } from 'vitest'
import { handleImport } from '../lib/import/handle'
import { ImportError, type ImportResult } from '../lib/import'

const config = {
  directusUrl: 'http://localhost:8056',
  adminToken: 'admin-tok',
  anthropicApiKey: 'sk-x',
  importSecret: 'shh',
  importModel: 'claude-haiku-4-5'
}

const result: ImportResult = {
  id: 'new', slug: 'widget-x', created: true, category: 'Boards',
  tagCount: 1, datasheetCount: 0, imageCount: 0, warnings: [], sourceUrl: 'https://x'
}

const runImpl = async () => result

async function status(p: Promise<unknown>): Promise<number> {
  try {
    await p
    return 200
  } catch (e) {
    return e instanceof ImportError ? e.status : 500
  }
}

describe('handleImport', () => {
  it('rejects a missing or wrong secret with 401', async () => {
    expect(await status(handleImport({ body: { url: 'https://x' }, secretHeader: undefined, config, runImpl }))).toBe(401)
    expect(await status(handleImport({ body: { url: 'https://x' }, secretHeader: 'wrong', config, runImpl }))).toBe(401)
  })

  it('refuses to run when no import secret is configured (500)', async () => {
    const cfg = { ...config, importSecret: '' }
    expect(await status(handleImport({ body: { url: 'https://x' }, secretHeader: '', config: cfg, runImpl }))).toBe(500)
  })

  it('rejects a missing/invalid url with 400', async () => {
    expect(await status(handleImport({ body: {}, secretHeader: 'shh', config, runImpl }))).toBe(400)
    expect(await status(handleImport({ body: { url: 42 }, secretHeader: 'shh', config, runImpl }))).toBe(400)
  })

  it('runs the import with a valid secret and returns the result', async () => {
    let receivedModel = ''
    const run = async (input: { model: string }) => {
      receivedModel = input.model
      return result
    }
    const out = await handleImport({ body: { url: 'https://x' }, secretHeader: 'shh', config, runImpl: run })
    expect(out.slug).toBe('widget-x')
    expect(receivedModel).toBe('claude-haiku-4-5')
  })
})
