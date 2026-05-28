<script setup lang="ts">
import type { Tutorial } from '~/types/directus'

const props = defineProps<{ tutorial: Tutorial }>()
const asset = useAssetUrl()

const coverId = computed(() => {
  const c = props.tutorial.cover
  return typeof c === 'string' ? c : c?.id ?? null
})

const coverUrl = computed(() => asset(coverId.value, { width: 600, height: 300, fit: 'cover', format: 'auto' }))
</script>

<template>
  <NuxtLink
    :to="`/tutorials/${tutorial.slug}`"
    class="block"
  >
    <UCard class="hover:shadow-lg transition h-full">
      <template #header>
        <div class="aspect-[2/1] bg-muted rounded overflow-hidden flex items-center justify-center">
          <img
            v-if="coverUrl"
            :src="coverUrl"
            :alt="tutorial.title"
            class="object-cover w-full h-full"
          >
          <UIcon
            v-else
            name="i-lucide-book-open"
            class="text-4xl text-muted"
          />
        </div>
      </template>
      <h3 class="font-semibold">
        {{ tutorial.title }}
      </h3>
      <p
        v-if="tutorial.summary"
        class="text-sm text-muted mt-1"
      >
        {{ tutorial.summary }}
      </p>
    </UCard>
  </NuxtLink>
</template>
