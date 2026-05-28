import { createDirectus, rest, staticToken } from '@directus/sdk'
import type { Schema } from '~/types/directus'

let _client: ReturnType<typeof buildClient> | null = null

function buildClient() {
  const config = useRuntimeConfig()
  const url = config.public.directusUrl as string
  const token = (config.directusToken || config.public.directusToken) as string | undefined
  const c = createDirectus<Schema>(url).with(rest())
  return token ? c.with(staticToken(token)) : c
}

export function useDirectus() {
  if (!_client) _client = buildClient()
  return _client
}
