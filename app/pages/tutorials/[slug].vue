<script setup lang="ts">
import { readItems } from '@directus/sdk'
import type { Tutorial, Component } from '~/types/directus'

const route = useRoute()
const slug = route.params.slug as string
const client = useDirectus()
const asset = useAssetUrl()

const { data: tutorial } = await useAsyncData<Tutorial | null>(`tutorial-${slug}`, async () => {
  const items = await client.request(readItems('tutorials', {
    filter: { slug: { _eq: slug }, status: { _eq: 'published' } } as never,
    limit: 1,
    fields: [
      'id', 'title', 'slug', 'summary', 'content', 'date_published',
      { cover: ['id', 'filename_download'] },
      { components: [{ components_id: ['id', 'slug', 'name'] }] }
    ] as never
  }))
  return ((items as unknown as Tutorial[])[0]) ?? null
})

if (!tutorial.value) throw createError({ statusCode: 404, statusMessage: 'Tutorial not found' })

const coverId = computed(() => {
  const c = tutorial.value?.cover
  return typeof c === 'string' ? c : c?.id ?? null
})

const coverUrl = computed(() => asset(coverId.value, { width: 1400, fit: 'cover', format: 'auto' }))

const relatedComponents = computed(() => (tutorial.value?.components ?? [])
  .map(r => typeof r.components_id === 'string' ? null : r.components_id)
  .filter((c): c is Component => !!c))

useSeoMeta({
  title: () => `${tutorial.value?.title} — Smidae`,
  description: () => tutorial.value?.summary ?? null
})
</script>

<template>
  <UContainer
    v-if="tutorial"
    class="py-8 max-w-3xl space-y-6"
  >
    <nav class="text-sm flex items-center gap-2 text-muted">
      <NuxtLink
        to="/tutorials"
        class="hover:underline"
      >
        Tutorials
      </NuxtLink>
      <span>/</span>
      <span class="text-foreground">{{ tutorial.title }}</span>
    </nav>
    <h1 class="text-3xl font-bold">
      {{ tutorial.title }}
    </h1>
    <p
      v-if="tutorial.summary"
      class="text-lg text-muted"
    >
      {{ tutorial.summary }}
    </p>
    <img
      v-if="coverUrl"
      :src="coverUrl"
      class="w-full rounded"
    >
    <MarkdownBlock :source="tutorial.content" />
    <section
      v-if="relatedComponents.length"
      class="pt-6 border-t"
    >
      <h2 class="text-lg font-semibold mb-3">
        Components used
      </h2>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="c in relatedComponents"
          :key="c.id"
          :to="`/components/${c.slug}`"
        >
          <UBadge
            color="primary"
            variant="soft"
            size="lg"
          >
            {{ c.name }}
          </UBadge>
        </NuxtLink>
      </div>
    </section>
  </UContainer>
</template>
