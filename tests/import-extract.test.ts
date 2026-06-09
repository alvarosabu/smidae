import { describe, it, expect } from 'vitest'
import { extract } from '../lib/import/extract'
import type { ExtractedComponent } from '../lib/import/schema'

const base: ExtractedComponent = {
  name: 'Widget X',
  manufacturer: 'Example',
  part_number: 'WX-1',
  overview: 'A board.',
  features: [],
  specs: [],
  availability: 'available',
  category: 'Boards',
  tags: ['wifi'],
  datasheetUrls: [],
  imageUrls: []
}

const candidates = {
  text: 'Widget X is a board.',
  links: [{ url: 'https://cdn.example.com/real-datasheet.pdf', text: 'Datasheet' }],
  images: [{ url: 'https://cdn.example.com/real.png', alt: 'board' }]
}

describe('extract', () => {
  it('drops datasheet/image URLs the model returned that are not in the candidate set', async () => {
    const generate = async () => ({
      ...base,
      datasheetUrls: ['https://cdn.example.com/real-datasheet.pdf', 'https://evil.example.com/made-up.pdf'],
      imageUrls: ['https://cdn.example.com/real.png', 'https://evil.example.com/hallucinated.png']
    })
    const result = await extract({ ...candidates, apiKey: 'x', model: 'm', generate })
    expect(result.datasheetUrls).toEqual(['https://cdn.example.com/real-datasheet.pdf'])
    expect(result.imageUrls).toEqual(['https://cdn.example.com/real.png'])
  })

  it('passes the cleaned text and candidate lists to the model', async () => {
    let received: { system: string, prompt: string } | null = null
    const generate = async (args: { system: string, prompt: string }) => {
      received = args
      return base
    }
    await extract({ ...candidates, apiKey: 'x', model: 'm', generate })
    expect(received!.prompt).toContain('Widget X is a board.')
    expect(received!.prompt).toContain('https://cdn.example.com/real-datasheet.pdf')
    expect(received!.prompt).toContain('https://cdn.example.com/real.png')
  })

  it('keeps valid extracted fields intact', async () => {
    const generate = async () => ({ ...base, name: 'Widget X', availability: 'eol' as const })
    const result = await extract({ ...candidates, apiKey: 'x', model: 'm', generate })
    expect(result.name).toBe('Widget X')
    expect(result.availability).toBe('eol')
  })
})
