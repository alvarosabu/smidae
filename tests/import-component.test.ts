import { describe, it, expect } from 'vitest'
import { importComponent, type DirectusOps } from '../lib/import/import-component'
import type { ExtractedComponent } from '../lib/import/schema'

function makeData(over: Partial<ExtractedComponent> = {}): ExtractedComponent {
  return {
    name: 'Arduino MKR 1000 WiFi',
    manufacturer: 'Arduino',
    part_number: 'ABX00011',
    overview: 'A board.',
    features: [],
    specs: [],
    availability: 'available',
    category: 'Boards',
    tags: ['wifi', 'arduino'],
    datasheetUrls: [],
    imageUrls: [],
    ...over
  }
}

interface Recorder {
  ops: DirectusOps
  created: { payload?: Record<string, unknown>, importedFiles: Array<{ url: string, title: string }>, createdCategories: string[], createdTags: string[] }
}

function makeOps(opts: {
  existingSlug?: string
  existingCategory?: string
  existingTags?: string[]
} = {}): Recorder {
  const rec: Recorder['created'] = { importedFiles: [], createdCategories: [], createdTags: [] }
  let fileSeq = 0
  const ops: DirectusOps = {
    async findComponentBySlug(slug) {
      return opts.existingSlug === slug ? { id: 'existing-id', slug } : null
    },
    async findCategory(name) {
      return opts.existingCategory === name ? { id: 'cat-existing' } : null
    },
    async createCategory({ name, slug }) {
      rec.createdCategories.push(slug)
      return { id: `cat-${name}` }
    },
    async findTag(name) {
      return opts.existingTags?.includes(name) ? { id: `tag-${name}` } : null
    },
    async createTag(name) {
      rec.createdTags.push(name)
      return { id: `tag-${name}` }
    },
    async importFileFromUrl(url, title) {
      rec.importedFiles.push({ url, title })
      return { id: `file-${fileSeq++}` }
    },
    async createComponent(payload) {
      rec.payload = payload
      return { id: 'new-id', slug: payload.slug as string }
    }
  }
  return { ops, created: rec }
}

const allPdf = async () => 'application/pdf'

describe('importComponent', () => {
  it('is idempotent: returns the existing component without creating when the slug exists', async () => {
    const { ops, created } = makeOps({ existingSlug: 'arduino-mkr-1000-wifi' })
    const result = await importComponent({ data: makeData(), sourceUrl: 'https://x', ops, probeContentType: allPdf })
    expect(result.created).toBe(false)
    expect(result.id).toBe('existing-id')
    expect(created.payload).toBeUndefined()
  })

  it('creates a draft with a kebab slug, quantity 1, and the extracted availability', async () => {
    const { ops, created } = makeOps()
    await importComponent({ data: makeData({ availability: 'eol' }), sourceUrl: 'https://x', ops, probeContentType: allPdf })
    expect(created.payload!.slug).toBe('arduino-mkr-1000-wifi')
    expect(created.payload!.status).toBe('draft')
    expect(created.payload!.quantity).toBe(1)
    expect(created.payload!.availability).toBe('eol')
  })

  it('reuses an existing category and does not create one', async () => {
    const { ops, created } = makeOps({ existingCategory: 'Boards' })
    await importComponent({ data: makeData(), sourceUrl: 'https://x', ops, probeContentType: allPdf })
    expect(created.createdCategories).toEqual([])
    expect(created.payload!.category).toBe('cat-existing')
  })

  it('auto-creates a missing category', async () => {
    const { ops, created } = makeOps()
    await importComponent({ data: makeData({ category: 'Microcontrollers' }), sourceUrl: 'https://x', ops, probeContentType: allPdf })
    expect(created.createdCategories).toEqual(['microcontrollers'])
  })

  it('reuses existing tags and creates only missing ones', async () => {
    const { ops, created } = makeOps({ existingTags: ['wifi'] })
    await importComponent({ data: makeData({ tags: ['wifi', 'arduino'] }), sourceUrl: 'https://x', ops, probeContentType: allPdf })
    expect(created.createdTags).toEqual(['arduino'])
    expect(created.payload!.tags).toEqual([{ tags_id: 'tag-wifi' }, { tags_id: 'tag-arduino' }])
  })

  it('imports PDFs as datasheets and images as gallery, with the first image as thumbnail', async () => {
    const { ops, created } = makeOps()
    const probe = async (url: string) => (url.endsWith('.pdf') ? 'application/pdf' : 'image/png')
    await importComponent({
      data: makeData({
        datasheetUrls: ['https://cdn/d.pdf'],
        imageUrls: ['https://cdn/a.png', 'https://cdn/b.png']
      }),
      sourceUrl: 'https://x',
      ops,
      probeContentType: probe
    })
    expect(created.importedFiles.map(f => f.url)).toEqual(['https://cdn/d.pdf', 'https://cdn/a.png', 'https://cdn/b.png'])
    expect(created.payload!.datasheets).toEqual([{ directus_files_id: 'file-0' }])
    expect(created.payload!.gallery).toEqual([{ directus_files_id: 'file-1' }, { directus_files_id: 'file-2' }])
    expect(created.payload!.thumbnail).toBe('file-1')
  })

  it('treats a Directus file-import failure as a warning and still creates the component', async () => {
    const { ops, created } = makeOps()
    const failingOps: DirectusOps = {
      ...ops,
      async importFileFromUrl() {
        throw new Error('Service "external-file" is unavailable.')
      }
    }
    const result = await importComponent({
      data: makeData({ datasheetUrls: ['https://cdn/d.pdf'], imageUrls: ['https://cdn/a.png'] }),
      sourceUrl: 'https://x',
      ops: failingOps,
      probeContentType: async () => 'application/pdf'
    })
    expect(result.created).toBe(true)
    expect(created.payload!.datasheets).toEqual([])
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.some(w => w.includes('d.pdf'))).toBe(true)
  })

  it('skips a file whose content-type does not match and records a warning', async () => {
    const { ops, created } = makeOps()
    const probe = async (url: string) => (url.endsWith('.pdf') ? 'text/html' : 'image/png')
    const result = await importComponent({
      data: makeData({ datasheetUrls: ['https://cdn/notreally.pdf'], imageUrls: ['https://cdn/a.png'] }),
      sourceUrl: 'https://x',
      ops,
      probeContentType: probe
    })
    expect(created.importedFiles.map(f => f.url)).toEqual(['https://cdn/a.png'])
    expect(created.payload!.datasheets).toEqual([])
    expect(result.warnings.some(w => w.includes('notreally.pdf'))).toBe(true)
  })
})
