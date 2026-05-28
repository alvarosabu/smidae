<script setup lang="ts">
import type { Component } from '~/types/directus'

const props = defineProps<{ component: Component }>()
const asset = useAssetUrl()

const firstImageId = computed(() => {
  const first = props.component.gallery?.[0]
  if (!first) return null
  const ref = first.directus_files_id
  return typeof ref === 'string' ? ref : ref?.id ?? null
})

const imageUrl = computed(() => asset(firstImageId.value, { width: 600, height: 400, fit: 'cover', format: 'auto' }))

const categoryName = computed(() => {
  const c = props.component.category
  return c && typeof c !== 'string' ? c.name : null
})

const tagNames = computed(() => (props.component.tags ?? [])
  .map(t => typeof t.tags_id === 'string' ? null : t.tags_id?.name)
  .filter((n): n is string => !!n))
</script>

<template>
  <NuxtLink
    :to="`/components/${component.slug}`"
    class="block"
  >
    <UCard class="hover:shadow-lg transition h-full">
      <template #header>
        <div class="aspect-[3/2] bg-muted rounded overflow-hidden flex items-center justify-center">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            :alt="component.name"
            class="object-cover w-full h-full"
          >
          <UIcon
            v-else
            name="i-lucide-cpu"
            class="text-4xl text-muted"
          />
        </div>
      </template>
      <div class="space-y-1">
        <h3 class="font-semibold truncate">
          {{ component.name }}
        </h3>
        <p class="text-xs text-muted">
          <span v-if="categoryName">{{ categoryName }}</span>
          <span v-if="component.manufacturer"> · {{ component.manufacturer }}</span>
        </p>
        <div class="flex items-center justify-between text-sm pt-1">
          <UBadge
            variant="soft"
            color="neutral"
          >
            Qty {{ component.quantity }}
          </UBadge>
          <div class="flex gap-1 flex-wrap justify-end">
            <UBadge
              v-for="t in tagNames.slice(0, 3)"
              :key="t"
              variant="subtle"
              color="primary"
            >
              {{ t }}
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>
