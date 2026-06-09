<script setup lang="ts">
const { data: projects } = useProjectsList()

useSeoMeta({
  title: 'Projects — Smidae',
  description: 'Builds and projects made from the components in the catalog.'
})
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <h1 class="text-2xl font-bold">
      Projects
    </h1>
    <div
      v-if="projects && projects.length"
      class="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <ProjectsCard
        v-for="p in projects"
        :key="p.id"
        :project="p"
      />
    </div>
    <UAlert
      v-else
      icon="i-lucide-info"
      title="No projects yet"
    />
  </UContainer>
</template>
