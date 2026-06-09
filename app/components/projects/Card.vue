<script setup lang="ts">
import type { Project } from '~/types/directus'

const props = defineProps<{ project: Project }>()
const asset = useAssetUrl()

const thumbnailId = computed(() => {
  const t = props.project.thumbnail
  return typeof t === 'string' ? t : t?.id ?? null
})

const imageUrl = computed(() => asset(thumbnailId.value, { width: 600, height: 300, fit: 'cover', format: 'auto' }))
</script>

<template>
  <NuxtLink
    :to="`/projects/${project.slug}`"
    class="block"
  >
    <UCard class="hover:shadow-lg transition h-full">
      <template #header>
        <div class="aspect-[2/1] bg-muted rounded overflow-hidden flex items-center justify-center">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            :alt="project.title"
            class="object-cover w-full h-full"
          >
          <UIcon
            v-else
            name="i-lucide-layout-dashboard"
            class="text-4xl text-muted"
          />
        </div>
      </template>
      <h3 class="font-semibold">
        {{ project.title }}
      </h3>
      <p
        v-if="project.summary"
        class="text-sm text-muted mt-1"
      >
        {{ project.summary }}
      </p>
    </UCard>
  </NuxtLink>
</template>
