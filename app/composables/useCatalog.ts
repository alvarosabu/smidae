import { readItems } from '@directus/sdk'
import type { Component, Category, Tag, Project } from '~/types/directus'

export interface CatalogQuery {
  search?: string
  category?: string
  tags?: string[]
  availability?: string
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
      if (query.value.availability) filter.availability = { _eq: query.value.availability }
      const items = await client.request(readItems('components', {
        filter: filter as never,
        search: query.value.search || undefined,
        sort: [query.value.sort ?? '-date_created'] as never,
        limit: 100,
        fields: [
          'id', 'slug', 'name', 'availability', 'manufacturer', 'part_number', 'quantity', 'price', 'thumbnail',
          { category: ['id', 'name', 'slug'] },
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

export function useProjectsList() {
  const client = useDirectus()
  return useAsyncData<Project[]>('projects-list', async () => {
    const items = await client.request(readItems('projects', {
      filter: { status: { _eq: 'published' } } as never,
      sort: ['-date_created'] as never,
      fields: ['id', 'title', 'slug', 'summary', { thumbnail: ['id'] }] as never,
      limit: 100
    }))
    return items as unknown as Project[]
  }, { default: () => [] })
}

export function useTags() {
  const client = useDirectus()
  return useAsyncData<Tag[]>('tags', async () => {
    const items = await client.request(readItems('tags', { sort: ['name'] as never }))
    return items as unknown as Tag[]
  }, { default: () => [] })
}
