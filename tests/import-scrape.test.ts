import { describe, it, expect } from 'vitest'
import { scrape } from '../lib/import/scrape'

const BASE = 'https://docs.example.com/hardware/widget-x/'

const HTML = `<!doctype html>
<html>
  <head>
    <title>Widget X — Example</title>
    <meta property="og:image" content="https://cdn.example.com/widget-x-hero.png">
    <style>.a{color:red}</style>
    <script>console.log('tracking')</script>
  </head>
  <body>
    <nav><a href="/home">Home</a></nav>
    <header>site header junk</header>
    <main>
      <h1>Widget X</h1>
      <p>The Widget X is a   dual-core board.</p>
      <a href="/files/widget-x-datasheet.pdf">Datasheet (PDF)</a>
      <a href="https://cdn.example.com/schematic.pdf">Schematic</a>
      <img src="../img/widget-x.png" alt="Widget X board">
      <svg><path d="M0 0"/></svg>
    </main>
    <footer>copyright junk</footer>
  </body>
</html>`

describe('scrape', () => {
  const result = scrape(HTML, BASE)

  it('extracts the page title', () => {
    expect(result.title).toBe('Widget X — Example')
  })

  it('keeps main body text', () => {
    expect(result.text).toContain('The Widget X is a dual-core board.')
  })

  it('collapses runs of whitespace', () => {
    expect(result.text).not.toMatch(/ {2,}/)
  })

  it('strips script, style, nav, header, footer, and svg content', () => {
    expect(result.text).not.toContain('tracking')
    expect(result.text).not.toContain('color:red')
    expect(result.text).not.toContain('site header junk')
    expect(result.text).not.toContain('copyright junk')
  })

  it('collects links with anchor text and absolutizes relative hrefs', () => {
    const urls = result.candidateLinks.map(l => l.url)
    expect(urls).toContain('https://docs.example.com/files/widget-x-datasheet.pdf')
    expect(urls).toContain('https://cdn.example.com/schematic.pdf')
    const datasheet = result.candidateLinks.find(l => l.url.endsWith('widget-x-datasheet.pdf'))
    expect(datasheet?.text).toBe('Datasheet (PDF)')
  })

  it('collects images (img src + og:image) absolutized, with alt text', () => {
    const urls = result.candidateImages.map(i => i.url)
    expect(urls).toContain('https://docs.example.com/hardware/img/widget-x.png')
    expect(urls).toContain('https://cdn.example.com/widget-x-hero.png')
    const board = result.candidateImages.find(i => i.url.endsWith('widget-x.png'))
    expect(board?.alt).toBe('Widget X board')
  })

  it('dedupes repeated URLs', () => {
    const urls = result.candidateImages.map(i => i.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})
