<script setup lang="ts">
defineProps<{ html: string | null | undefined }>()
</script>

<template>
  <div
    class="prose dark:prose-invert max-w-none"
    v-html="html ?? ''"
  />
</template>
