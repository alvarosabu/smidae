import { createDirectus, rest, staticToken } from '@directus/sdk'
import { ImportError, runImport, type ImportResult, type RunImportInput } from './index'

export interface HandleImportConfig {
  directusUrl: string
  adminToken: string
  anthropicApiKey: string
  importSecret: string
  importModel: string
}

export interface HandleImportArgs {
  body: unknown
  secretHeader: string | undefined
  config: HandleImportConfig
  /** Injectable for tests; defaults to building an admin client and calling runImport. */
  runImpl?: (input: RunImportInput) => Promise<ImportResult>
}

/**
 * Framework-agnostic guard + dispatch for the import endpoint. The Nitro route is
 * a thin adapter over this; keeping it here makes the auth/validation testable.
 */
export async function handleImport(args: HandleImportArgs): Promise<ImportResult> {
  const { body, secretHeader, config } = args

  if (!config.importSecret) {
    throw new ImportError('Import endpoint is not configured (missing IMPORT_SECRET).', 500)
  }
  if (secretHeader !== config.importSecret) {
    throw new ImportError('Unauthorized', 401)
  }

  const url = (body as { url?: unknown } | null)?.url
  if (typeof url !== 'string' || !url.trim()) {
    throw new ImportError('Body must include a "url" string.', 400)
  }
  if (!config.anthropicApiKey) {
    throw new ImportError('Import endpoint is not configured (missing ANTHROPIC_API_KEY).', 500)
  }

  const runImpl = args.runImpl ?? ((input: RunImportInput) => {
    const client = createDirectus(config.directusUrl).with(rest()).with(staticToken(config.adminToken))
    return runImport({ ...input, client })
  })

  return runImpl({ url, apiKey: config.anthropicApiKey, model: config.importModel })
}
