<script setup lang="ts">
import type { Component } from '~/types/directus'

const props = defineProps<{ component: Component }>()
const asset = useAssetUrl()

const thumbnailId = computed(() => {
  const t = props.component.thumbnail
  if (!t) return null
  return typeof t === 'string' ? t : t.id ?? null
})

const imageUrl = computed(() => asset(thumbnailId.value, { width: 600, height: 400, fit: 'cover', format: 'auto' }))

const categoryName = computed(() => {
  const c = props.component.category
  return c && typeof c !== 'string' ? c.name : null
})

const tagNames = computed(() => (props.component.tags ?? [])
  .map(t => typeof t.tags_id === 'string' ? null : t.tags_id?.name)
  .filter((n): n is string => !!n))

const price = computed(() => formatPrice(props.component.price))

const availability = computed(() =>
  props.component.availability === 'available' ? null : getAvailability(props.component.availability))
</script>

<template>
  <NuxtLink
    :to="`/components/${component.slug}`"
    class="block"
  >
    <UCard class="hover:shadow-lg transition h-full">
      <template #header>
        <div class="aspect-[3/2] bg-muted rounded overflow-hidden flex items-center justify-center relative">
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
          <UBadge
            v-if="availability"
            :color="availability.color"
            variant="solid"
            size="sm"
            class="absolute top-2 left-2"
          >
            {{ availability.label }}
          </UBadge>
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
        <div class="flex items-center justify-between text-sm py-2">
          <span class="inline-flex items-center gap-1 text-muted">
            <UIcon
              name="i-lucide-package"
              class="size-4"
            />
            {{ component.quantity }} in stock
          </span>
          <span
            v-if="price"
            class="font-semibold"
          >
            {{ price }}
          </span>
        </div>
        <div class="flex gap-1 flex-wrap justify-start">
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
    </UCard>
  </NuxtLink>
</template>
