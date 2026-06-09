<script setup lang="ts">
import type { CatalogQuery } from '~/composables/useCatalog'

const query = ref<CatalogQuery>({ search: '', sort: '-date_created', tags: [] })
const searchInput = ref('')
const debouncedSearch = useDebounceFn((v: string) => {
  query.value.search = v
}, 250)
watch(searchInput, v => debouncedSearch(v))

const { data, pending } = useCatalogList(query)

useSeoMeta({
  title: 'Catalog — Smidae',
  description: 'Browse electronic components, boards, and sensors.'
})
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <div class="flex items-baseline justify-between">
      <h1 class="text-2xl font-bold">
        Component Catalog
      </h1>
      <span class="text-sm text-muted">{{ data?.length ?? 0 }} components</span>
    </div>
    <CatalogToolbar
      v-model:search="searchInput"
      v-model:sort="query.sort"
    />
    <CatalogFilters
      v-model:category="query.category"
      v-model:tags="query.tags"
      v-model:availability="query.availability"
    />
    <div
      v-if="pending"
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <USkeleton
        v-for="i in 8"
        :key="i"
        class="h-56 w-full"
      />
    </div>
    <div
      v-else-if="data && data.length"
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <CatalogCard
        v-for="c in data"
        :key="c.id"
        :component="c"
      />
    </div>
    <UAlert
      v-else
      icon="i-lucide-info"
      title="No components match"
      description="Try clearing filters or run pnpm seed to add sample data."
    />
  </UContainer>
</template>
