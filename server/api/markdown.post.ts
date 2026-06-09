export default defineEventHandler(async (event) => {
  const { source } = await readBody<{ source?: string | null }>(event)
  if (!source) return { html: '' }
  return { html: await renderMarkdown(source) }
})
