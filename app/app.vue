<script setup lang="ts">
const config = useRuntimeConfig()
const adminUrl = computed(() => `${config.public.directusUrl}/admin`)

useHead({
  htmlAttrs: { lang: 'en' },
  link: [{ rel: 'icon', href: '/favicon.ico' }]
})
useSeoMeta({
  title: 'Smidae — Component Catalog',
  description: 'Personal catalog of electronic components, boards, sensors, and tutorials.'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2 font-semibold"
        >
          <img
            src="/logo.svg"
            alt="Smidae"
            class="h-8 w-8"
          >
          <span>Smidae</span>
        </NuxtLink>
      </template>
      <template #right>
        <UButton
          to="/projects"
          variant="ghost"
          label="Projects"
        />
        <UButton
          to="/tutorials"
          variant="ghost"
          label="Tutorials"
        />
        <UColorModeButton />
        <UButton
          :to="adminUrl"
          target="_blank"
          icon="i-lucide-database"
          variant="ghost"
          aria-label="Open Directus admin"
        />
      </template>
    </UHeader>
    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
