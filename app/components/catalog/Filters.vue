<script setup lang="ts">
const category = defineModel<string | undefined>('category')
const tags = defineModel<string[]>('tags', { default: () => [] })
const availability = defineModel<string | undefined>('availability')

const { data: categories } = await useCategories()
const { data: tagList } = await useTags()

const catItems = computed(() => (categories.value ?? []).map(c => ({ label: c.name, value: c.id })))
const tagItems = computed(() => (tagList.value ?? []).map(t => ({ label: t.name, value: t.id })))
const availabilityItems = AVAILABILITY.map(a => ({ label: a.label, value: a.value as string }))

function clearFilters() {
  category.value = undefined
  tags.value = []
  availability.value = undefined
}
</script>

<template>
  <div class="flex flex-wrap gap-2 items-center">
    <USelectMenu
      v-model="category"
      :items="catItems"
      value-key="value"
      placeholder="All categories"
      class="min-w-48"
    />
    <USelectMenu
      v-model="tags"
      multiple
      :items="tagItems"
      value-key="value"
      placeholder="Tags"
      class="min-w-48"
    />
    <USelectMenu
      v-model="availability"
      :items="availabilityItems"
      value-key="value"
      placeholder="All availability"
      class="min-w-48"
    />
    <UButton
      v-if="category || tags.length || availability"
      variant="ghost"
      size="xs"
      icon="i-lucide-x"
      label="Clear"
      @click="clearFilters"
    />
  </div>
</template>
