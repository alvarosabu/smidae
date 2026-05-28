import type { DirectusFile } from '~/types/directus'

export interface AssetTransform {
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'inside' | 'outside'
  quality?: number
  format?: 'auto' | 'webp' | 'jpg' | 'png'
  key?: string
}

export function buildAssetUrl(
  baseUrl: string,
  file: string | DirectusFile | { id: string } | null | undefined,
  transform?: AssetTransform,
): string | null {
  if (!file) return null
  const id = typeof file === 'string' ? file : file.id
  if (!id) return null
  const url = new URL(`/assets/${id}`, baseUrl)
  if (transform) {
    for (const [k, v] of Object.entries(transform)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

export function useAssetUrl() {
  const { public: { directusUrl } } = useRuntimeConfig()
  return (file: Parameters<typeof buildAssetUrl>[1], transform?: AssetTransform) =>
    buildAssetUrl(directusUrl as string, file, transform)
}
