import { generateObject } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { extractedComponentSchema, type ExtractedComponent } from './schema'
import type { CandidateLink, CandidateImage } from './scrape'

const SYSTEM_PROMPT = `You turn a scraped product page into a structured catalog entry for a personal
electronics inventory (Arduino boards, sensors, modules, ICs, passives).

Rules:
- Accuracy over completeness. Leave a field empty/null rather than guessing. Never
  invent specs, voltages, or part numbers.
- "overview" is concise markdown, 2–4 short paragraphs.
- "specs" values are human-readable with units (e.g. "3.3 V", "240 MHz", "4 MB").
- "tags" are 3–8 lowercase, hyphenated terms (protocols, form factor, family).
- "availability": infer from the page — "discontinued"/"retired"/"EOL"/"not
  recommended for new designs" → eol or discontinued; otherwise "available".
- "datasheetUrls" / "imageUrls": choose ONLY from the candidate lists provided in
  the prompt. Never output a URL that is not in those lists. Prefer real
  datasheets/schematics/manuals (PDFs) and clean product images.`

export interface ExtractInput {
  text: string
  links: CandidateLink[]
  images: CandidateImage[]
  apiKey: string
  model: string
  /** Injectable for tests; defaults to a Vercel AI SDK structured-output call. */
  generate?: (args: { system: string, prompt: string }) => Promise<ExtractedComponent>
}

function buildPrompt(text: string, links: CandidateLink[], images: CandidateImage[]): string {
  const linkLines = links.map(l => `- ${l.url}${l.text ? ` (${l.text})` : ''}`).join('\n')
  const imageLines = images.map(i => `- ${i.url}${i.alt ? ` (${i.alt})` : ''}`).join('\n')
  return [
    'PAGE TEXT:',
    text,
    '',
    'CANDIDATE LINKS (choose datasheet PDFs from here only):',
    linkLines || '(none)',
    '',
    'CANDIDATE IMAGES (choose product images from here only):',
    imageLines || '(none)'
  ].join('\n')
}

/**
 * One structured-output LLM call over the cleaned page text. Post-validates that
 * every returned file URL came from the candidate set, dropping any the model
 * fabricated.
 */
export async function extract(input: ExtractInput): Promise<ExtractedComponent> {
  const { text, links, images, apiKey, model } = input
  const prompt = buildPrompt(text, links, images)

  const generate = input.generate ?? (async ({ system, prompt }: { system: string, prompt: string }) => {
    const anthropic = createAnthropic({ apiKey })
    const { object } = await generateObject({
      model: anthropic(model),
      schema: extractedComponentSchema,
      system,
      prompt
    })
    return object
  })

  const result = await generate({ system: SYSTEM_PROMPT, prompt })

  const linkSet = new Set(links.map(l => l.url))
  const imageSet = new Set(images.map(i => i.url))
  return {
    ...result,
    datasheetUrls: result.datasheetUrls.filter(u => linkSet.has(u)),
    imageUrls: result.imageUrls.filter(u => imageSet.has(u))
  }
}
