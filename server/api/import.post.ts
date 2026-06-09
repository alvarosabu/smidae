import { handleImport } from '../../lib/import/handle'
import { ImportError } from '../../lib/import'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event).catch(() => null)

  try {
    return await handleImport({
      body,
      secretHeader: getHeader(event, 'x-import-secret'),
      config: {
        directusUrl: (config.directusInternalUrl as string) || (config.public.directusUrl as string),
        adminToken: config.directusAdminToken as string,
        anthropicApiKey: config.anthropicApiKey as string,
        importSecret: config.importSecret as string,
        importModel: config.importModel as string
      }
    })
  } catch (err) {
    if (err instanceof ImportError) {
      throw createError({ statusCode: err.status, statusMessage: err.message })
    }
    throw createError({ statusCode: 500, statusMessage: (err as Error).message })
  }
})
