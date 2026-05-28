<script setup lang="ts">
import type { FeatureItem } from '~/types/directus'

defineProps<{ items: FeatureItem[] }>()
</script>

<template>
  <ul class="grid sm:grid-cols-2 gap-3">
    <li
      v-for="(f, i) in items"
      :key="i"
      class="flex gap-3 p-3 rounded border"
    >
      <UIcon
        :name="`i-lucide-${f.icon ?? 'check-circle-2'}`"
        class="text-primary text-xl shrink-0 mt-0.5"
      />
      <div>
        <p class="font-medium">
          {{ f.title }}
        </p>
        <p class="text-sm text-muted">
          {{ f.description }}
        </p>
      </div>
    </li>
  </ul>
</template>
