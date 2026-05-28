<script setup lang="ts">
import { readItems } from '@directus/sdk'
import type { Tutorial } from '~/types/directus'

const client = useDirectus()

const { data: tutorials } = await useAsyncData<Tutorial[]>('tutorials-list', async () => {
  const items = await client.request(readItems('tutorials', {
    filter: { status: { _eq: 'published' } } as never,
    sort: ['-date_published', '-date_created'] as never,
    fields: ['id', 'title', 'slug', 'summary', { cover: ['id'] }] as never,
    limit: 100
  }))
  return items as unknown as Tutorial[]
}, { default: () => [] })

useSeoMeta({
  title: 'Tutorials — Smidae',
  description: 'Guides and walkthroughs for the components in the catalog.'
})
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <h1 class="text-2xl font-bold">
      Tutorials
    </h1>
    <div
      v-if="tutorials && tutorials.length"
      class="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <TutorialsCard
        v-for="t in tutorials"
        :key="t.id"
        :tutorial="t"
      />
    </div>
    <UAlert
      v-else
      icon="i-lucide-info"
      title="No tutorials yet"
    />
  </UContainer>
</template>
