import { readItems } from '@directus/sdk'
import type { Component, Category, Tag } from '~/types/directus'

export interface CatalogQuery {
  search?: string
  category?: string
  tags?: string[]
  sort?: 'name' | '-date_created' | '-date_updated' | '-quantity'
}

export function useCatalogList(query: Ref<CatalogQuery>) {
  const client = useDirectus()
  return useAsyncData<Component[]>(
    'catalog-list',
    async () => {
      const filter: Record<string, unknown> = { status: { _eq: 'published' } }
      if (query.value.category) filter.category = { _eq: query.value.category }
      if (query.value.tags?.length) filter.tags = { tags_id: { _in: query.value.tags } }
      const items = await client.request(readItems('components', {
        filter: filter as never,
        search: query.value.search || undefined,
        sort: [query.value.sort ?? '-date_created'] as never,
        limit: 100,
        fields: [
          'id', 'slug', 'name', 'manufacturer', 'part_number', 'quantity',
          { category: ['id', 'name', 'slug'] },
          { gallery: [{ directus_files_id: ['id'] }] },
          { tags: [{ tags_id: ['id', 'name'] }] }
        ] as never
      }))
      return items as unknown as Component[]
    },
    { watch: [query], default: () => [] }
  )
}

export function useCategories() {
  const client = useDirectus()
  return useAsyncData<Category[]>('categories', async () => {
    const items = await client.request(readItems('categories', { sort: ['sort', 'name'] as never }))
    return items as unknown as Category[]
  }, { default: () => [] })
}

export function useTags() {
  const client = useDirectus()
  return useAsyncData<Tag[]>('tags', async () => {
    const items = await client.request(readItems('tags', { sort: ['name'] as never }))
    return items as unknown as Tag[]
  }, { default: () => [] })
}
