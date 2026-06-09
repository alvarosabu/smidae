import { Marked } from 'marked'
import markedShiki from 'marked-shiki'
import { createHighlighter, type Highlighter } from 'shiki'

const LANGS = [
  'js', 'ts', 'jsx', 'tsx', 'vue', 'bash', 'shell',
  'json', 'html', 'css', 'glsl', 'markdown', 'yaml', 'diff',
  'cpp', 'c', 'python'
]

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ['github-dark'],
    langs: LANGS
  })
  return highlighterPromise
}

// Code blocks always render with the dark theme regardless of the site theme.
export async function renderMarkdown(source: string): Promise<string> {
  const highlighter = await getHighlighter()
  const loaded = highlighter.getLoadedLanguages()

  const marked = new Marked().use(markedShiki({
    highlight: (code: string, lang: string) => highlighter.codeToHtml(code, {
      lang: loaded.includes(lang) ? lang : 'text',
      theme: 'github-dark'
    })
  }))

  return marked.parse(source) as Promise<string>
}
