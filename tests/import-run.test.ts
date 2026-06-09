import { describe, it, expect } from 'vitest'
import { runImport, ImportError } from '../lib/import'
import type { DirectusOps } from '../lib/import/import-component'
import type { ExtractedComponent } from '../lib/import/schema'

const okData: ExtractedComponent = {
  name: 'Widget X',
  manufacturer: 'Example',
  part_number: null,
  overview: 'A board.',
  features: [],
  specs: [],
  availability: 'available',
  category: 'Boards',
  tags: [],
  datasheetUrls: [],
  imageUrls: []
}

const noopOps: DirectusOps = {
  findComponentBySlug: async () => null,
  findCategory: async () => ({ id: 'c' }),
  createCategory: async () => ({ id: 'c' }),
  findTag: async () => ({ id: 't' }),
  createTag: async () => ({ id: 't' }),
  importFileFromUrl: async () => ({ id: 'f' }),
  createComponent: async payload => ({ id: 'new', slug: payload.slug as string })
}

function htmlResponse(body: string) {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } })
}

describe('runImport', () => {
  it('rejects a URL that does not return HTML', async () => {
    const fetchImpl = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    await expect(
      runImport({ url: 'https://x/api.json', apiKey: 'k', model: 'm' }, { fetchImpl, ops: noopOps, extractImpl: async () => okData })
    ).rejects.toThrow(ImportError)
  })

  it('rejects a failed fetch', async () => {
    const fetchImpl = async () => new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } })
    await expect(
      runImport({ url: 'https://x/missing', apiKey: 'k', model: 'm' }, { fetchImpl, ops: noopOps, extractImpl: async () => okData })
    ).rejects.toThrow(ImportError)
  })

  it('rejects when extraction yields no product name', async () => {
    const body = 'A real product page with plenty of descriptive text about the device and its specs. '.repeat(6)
    const fetchImpl = async () => htmlResponse(`<html><body><main>${body}</main></body></html>`)
    const extractImpl = async () => ({ ...okData, name: '   ' })
    await expect(
      runImport({ url: 'https://x/page', apiKey: 'k', model: 'm' }, { fetchImpl, ops: noopOps, extractImpl })
    ).rejects.toThrow(/name/i)
  })

  it('rejects a page with too little extractable content (bot page / JS shell), without calling the model', async () => {
    // Mirrors Amazon's bot page: 200 OK, HTML, but almost no real body text.
    const thin = '<html><head><title>Amazon.es</title></head><body><main>Click below to keep shopping. Terms of use. Privacy notice.</main></body></html>'
    let extractCalled = false
    const extractImpl = async () => {
      extractCalled = true
      return okData
    }
    await expect(
      runImport({ url: 'https://x/bot', apiKey: 'k', model: 'm' }, { fetchImpl: async () => htmlResponse(thin), ops: noopOps, extractImpl })
    ).rejects.toThrow(/content/i)
    expect(extractCalled).toBe(false)
  })

  it('scrapes, extracts, and imports on the happy path', async () => {
    const body = 'The Widget X is a dual-core development board with Wi-Fi and Bluetooth. '.repeat(8)
    const fetchImpl = async () => htmlResponse(`<html><head><title>Widget X</title></head><body><main><h1>Widget X</h1><p>${body}</p></main></body></html>`)
    const result = await runImport(
      { url: 'https://x/page', apiKey: 'k', model: 'm' },
      { fetchImpl, ops: noopOps, extractImpl: async () => okData }
    )
    expect(result.created).toBe(true)
    expect(result.slug).toBe('widget-x')
    expect(result.sourceUrl).toBe('https://x/page')
  })
})
