<script setup lang="ts">
import type { DirectusFile } from '~/types/directus'

const props = defineProps<{ items: Array<{ directus_files_id: DirectusFile | string }> }>()
const asset = useAssetUrl()
const selected = ref(0)

const ids = computed(() => props.items
  .map(i => typeof i.directus_files_id === 'string' ? i.directus_files_id : i.directus_files_id?.id)
  .filter((id): id is string => !!id))

const mainUrl = computed(() => asset(ids.value[selected.value] ?? null, { width: 1000, fit: 'contain', format: 'auto' }))
</script>

<template>
  <div class="space-y-3">
    <div class="aspect-square bg-muted rounded overflow-hidden flex items-center justify-center">
      <img
        v-if="mainUrl"
        :src="mainUrl"
        class="object-contain w-full h-full"
      >
      <UIcon
        v-else
        name="i-lucide-cpu"
        class="text-6xl text-muted"
      />
    </div>
    <div
      v-if="ids.length > 1"
      class="flex gap-2 overflow-x-auto"
    >
      <button
        v-for="(id, i) in ids"
        :key="id"
        class="w-16 h-16 rounded overflow-hidden border-2 shrink-0"
        :class="i === selected ? 'border-primary' : 'border-transparent'"
        @click="selected = i"
      >
        <img
          :src="asset(id, { width: 120, height: 120, fit: 'cover' }) ?? ''"
          class="object-cover w-full h-full"
        >
      </button>
    </div>
  </div>
</template>
