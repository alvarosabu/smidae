<script setup lang="ts">
import { readItems } from '@directus/sdk'
import type { Tutorial } from '~/types/directus'

const props = defineProps<{ componentId: string }>()
const client = useDirectus()

const { data: tutorials } = await useAsyncData<Tutorial[]>(
  () => `related-tutorials-${props.componentId}`,
  async () => {
    const items = await client.request(readItems('tutorials', {
      filter: {
        status: { _eq: 'published' },
        components: { components_id: { _eq: props.componentId } }
      } as never,
      fields: ['id', 'title', 'slug', 'summary'] as never,
      limit: 20
    }))
    return items as unknown as Tutorial[]
  },
  { default: () => [] }
)
</script>

<template>
  <div
    v-if="tutorials && tutorials.length"
    class="space-y-2"
  >
    <NuxtLink
      v-for="t in tutorials"
      :key="t.id"
      :to="`/tutorials/${t.slug}`"
      class="block p-3 border rounded hover:bg-muted"
    >
      <p class="font-medium">
        {{ t.title }}
      </p>
      <p
        v-if="t.summary"
        class="text-sm text-muted"
      >
        {{ t.summary }}
      </p>
    </NuxtLink>
  </div>
  <p
    v-else
    class="text-sm text-muted"
  >
    No tutorials yet.
  </p>
</template>
