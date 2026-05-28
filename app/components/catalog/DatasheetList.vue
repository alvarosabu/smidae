<script setup lang="ts">
import type { DirectusFile } from '~/types/directus'

const props = defineProps<{ items: Array<{ directus_files_id: DirectusFile | string }> }>()
const asset = useAssetUrl()

const files = computed(() => props.items
  .map((i) => {
    const ref = i.directus_files_id
    const id = typeof ref === 'string' ? ref : ref?.id
    const name = typeof ref === 'string' ? id : ref?.filename_download
    return id ? { id, name: name ?? id, url: asset(id)! } : null
  })
  .filter((f): f is { id: string, name: string, url: string } => !!f))
</script>

<template>
  <div
    v-if="files.length"
    class="space-y-2"
  >
    <a
      v-for="f in files"
      :key="f.id"
      :href="f.url"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-2 p-2 border rounded hover:bg-muted"
    >
      <UIcon
        name="i-lucide-file-text"
        class="text-red-500"
      />
      <span class="flex-1 truncate underline">{{ f.name }}</span>
      <UIcon
        name="i-lucide-external-link"
        class="text-muted"
      />
    </a>
  </div>
</template>
