import * as cheerio from 'cheerio'

export interface CandidateLink {
  url: string
  text: string
}

export interface CandidateImage {
  url: string
  alt: string
}

export interface ScrapeResult {
  title: string
  text: string
  candidateLinks: CandidateLink[]
  candidateImages: CandidateImage[]
}

/** Tags whose contents are never useful product text. */
const STRIP = ['script', 'style', 'nav', 'header', 'footer', 'svg', 'noscript', 'iframe']

/** Resolve `href` against `base`; return null if it can't be made absolute. */
function absolutize(href: string | undefined, base: string): string | null {
  if (!href) return null
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

/**
 * Parse already-fetched HTML into clean text plus bounded candidate link/image
 * lists. Pure (no network) so it's trivially testable; `runImport` does the fetch.
 */
export function scrape(html: string, baseUrl: string): ScrapeResult {
  const $ = cheerio.load(html)

  const title = ($('title').first().text() || $('h1').first().text()).trim()

  // og:image before we strip <head>'s meta tags.
  const ogImage = absolutize($('meta[property="og:image"]').attr('content'), baseUrl)

  const links: CandidateLink[] = []
  $('a[href]').each((_, el) => {
    const url = absolutize($(el).attr('href'), baseUrl)
    if (!url) return
    links.push({ url, text: $(el).text().replace(/\s+/g, ' ').trim() })
  })

  const images: CandidateImage[] = []
  if (ogImage) images.push({ url: ogImage, alt: '' })
  $('img[src]').each((_, el) => {
    const url = absolutize($(el).attr('src'), baseUrl)
    if (!url) return
    images.push({ url, alt: ($(el).attr('alt') ?? '').trim() })
  })

  // Strip noise, then collapse whitespace for the text body.
  $(STRIP.join(',')).remove()
  const text = $('main').text() || $('body').text()
  const cleanText = text.replace(/\s+/g, ' ').trim()

  return {
    title,
    text: cleanText,
    candidateLinks: dedupeBy(links, l => l.url).slice(0, 50),
    candidateImages: dedupeBy(images, i => i.url).slice(0, 25)
  }
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}
