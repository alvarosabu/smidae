<script setup lang="ts">
import { marked } from 'marked'

const props = defineProps<{ source: string | null | undefined }>()
const html = computed(() => marked.parse(props.source ?? '', { async: false }) as string)
</script>

<template>
  <div
    class="prose dark:prose-invert max-w-none"
    v-html="html"
  />
</template>
