<script setup lang="ts">
import type { SpecItem } from '~/types/directus'

defineProps<{ items: SpecItem[] }>()
</script>

<template>
  <dl class="divide-y border rounded overflow-hidden">
    <div
      v-for="(s, i) in items"
      :key="i"
      class="grid grid-cols-3 px-4 py-2 text-sm"
    >
      <dt class="text-muted col-span-1">
        {{ s.label }}
      </dt>
      <dd class="col-span-2 font-medium">
        {{ s.value }}
      </dd>
    </div>
  </dl>
</template>
