<script setup lang="ts">
const search = defineModel<string>('search', { default: '' })
const sort = defineModel<string>('sort', { default: '-date_created' })

const sortOptions = [
  { label: 'Newest', value: '-date_created' },
  { label: 'Recently updated', value: '-date_updated' },
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Most stock', value: '-quantity' }
]
</script>

<template>
  <div class="flex flex-col sm:flex-row gap-3">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Search by name, part number, manufacturer…"
      class="flex-1"
    />
    <USelect
      v-model="sort"
      :items="sortOptions"
      class="min-w-48"
    />
  </div>
</template>
