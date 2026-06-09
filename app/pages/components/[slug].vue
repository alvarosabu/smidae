<script setup lang="ts">
import { readItems } from '@directus/sdk'
import type { Component } from '~/types/directus'

const route = useRoute()
const slug = route.params.slug as string
const client = useDirectus()

const { data: component } = await useAsyncData<Component | null>(`component-${slug}`, async () => {
  const items = await client.request(readItems('components', {
    filter: { slug: { _eq: slug }, status: { _eq: 'published' } } as never,
    limit: 1,
    fields: [
      'id', 'slug', 'name', 'availability', 'manufacturer', 'part_number', 'quantity', 'price', 'location',
      'overview', 'features', 'specs', 'date_created', 'date_updated', 'status',
      { category: ['id', 'name', 'slug'] },
      { thumbnail: ['id', 'filename_download', 'type'] },
      { gallery: [{ directus_files_id: ['id', 'filename_download', 'type'] }] },
      { datasheets: [{ directus_files_id: ['id', 'filename_download', 'type'] }] },
      { tags: [{ tags_id: ['id', 'name'] }] }
    ] as never
  }))
  return ((items as unknown as Component[])[0]) ?? null
})

if (!component.value) throw createError({ statusCode: 404, statusMessage: 'Component not found' })

const { data: overviewHtml } = await useAsyncData(`component-overview-${slug}`, () =>
  $fetch('/api/markdown', { method: 'POST', body: { source: component.value?.overview } }).then(r => r.html))

// Gallery view: thumbnail first, then the rest of the gallery (de-duped).
const galleryItems = computed(() => {
  const gallery = component.value?.gallery ?? []
  const thumb = component.value?.thumbnail
  if (!thumb) return gallery
  const thumbId = typeof thumb === 'string' ? thumb : thumb.id
  const rest = gallery.filter((g) => {
    const id = typeof g.directus_files_id === 'string' ? g.directus_files_id : g.directus_files_id?.id
    return id !== thumbId
  })
  return [{ directus_files_id: thumb }, ...rest]
})

const tagNames = computed(() => (component.value?.tags ?? [])
  .map(t => typeof t.tags_id === 'string' ? null : t.tags_id?.name)
  .filter((n): n is string => !!n))

const categoryName = computed(() => {
  const c = component.value?.category
  return c && typeof c !== 'string' ? c.name : null
})

const price = computed(() => formatPrice(component.value?.price))

const availability = computed(() => getAvailability(component.value?.availability))

useSeoMeta({
  title: () => `${component.value?.name} — Smidae`,
  description: () => component.value?.overview?.slice(0, 160) ?? null
})
</script>

<template>
  <UContainer
    v-if="component"
    class="py-8 max-w-6xl space-y-8"
  >
    <nav class="text-sm flex items-center gap-2 text-muted">
      <NuxtLink
        to="/"
        class="hover:underline"
      >
        Catalog
      </NuxtLink>
      <span>/</span>
      <span v-if="categoryName">{{ categoryName }}</span>
      <span v-if="categoryName">/</span>
      <span class="text-foreground">{{ component.name }}</span>
    </nav>

    <div class="grid lg:grid-cols-2 gap-8">
      <CatalogGallery :items="galleryItems" />
      <div class="space-y-4">
        <div>
          <h1 class="text-3xl font-bold">
            {{ component.name }}
          </h1>
          <p class="text-muted">
            <span v-if="component.manufacturer">{{ component.manufacturer }}</span>
            <span v-if="component.part_number"> · {{ component.part_number }}</span>
          </p>
        </div>
        <p
          v-if="price"
          class="text-2xl font-semibold text-primary"
        >
          {{ price }}
        </p>
        <div class="flex gap-2 flex-wrap items-center">
          <span class="inline-flex items-center gap-1.5 text-muted">
            <UIcon
              name="i-lucide-package"
              class="size-4"
            />
            {{ component.quantity }} in stock
          </span>
          <UBadge
            :color="availability.color"
            variant="subtle"
          >
            {{ availability.label }}
          </UBadge>
        </div>
        <div class="flex gap-2 flex-wrap">
          <UBadge
            v-if="component.location"
            color="neutral"
            variant="soft"
          >
            {{ component.location }}
          </UBadge>
          <UBadge
            v-for="t in tagNames"
            :key="t"
            color="primary"
            variant="subtle"
          >
            {{ t }}
          </UBadge>
        </div>
        <CatalogDatasheetList :items="component.datasheets ?? []" />
      </div>
    </div>

    <section v-if="component.overview">
      <h2 class="text-xl font-semibold mb-3">
        Overview
      </h2>
      <MarkdownBlock :html="overviewHtml" />
    </section>

    <section v-if="component.features?.length">
      <h2 class="text-xl font-semibold mb-3">
        Features
      </h2>
      <CatalogFeaturesList :items="component.features" />
    </section>

    <section v-if="component.specs?.length">
      <h2 class="text-xl font-semibold mb-3">
        Specifications
      </h2>
      <CatalogSpecsTable :items="component.specs" />
    </section>

    <section>
      <h2 class="text-xl font-semibold mb-3">
        Tutorials
      </h2>
      <CatalogRelatedTutorials :component-id="component.id" />
    </section>
  </UContainer>
</template>
