<script setup lang="ts">
import { readItems } from '@directus/sdk'
import type { Project } from '~/types/directus'

const route = useRoute()
const slug = route.params.slug as string
const client = useDirectus()

const { data: project } = await useAsyncData<Project | null>(`project-${slug}`, async () => {
  const items = await client.request(readItems('projects', {
    filter: { slug: { _eq: slug }, status: { _eq: 'published' } } as never,
    limit: 1,
    fields: [
      'id', 'title', 'slug', 'summary', 'content', 'date_created', 'date_updated', 'status',
      { thumbnail: ['id', 'filename_download', 'type'] },
      { gallery: [{ directus_files_id: ['id', 'filename_download', 'type'] }] },
      {
        components: [
          'id', 'quantity',
          { components_id: ['id', 'slug', 'name', 'quantity', 'price'] }
        ]
      }
    ] as never
  }))
  return ((items as unknown as Project[])[0]) ?? null
})

if (!project.value) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

const { data: contentHtml } = await useAsyncData(`project-html-${slug}`, () =>
  $fetch('/api/markdown', { method: 'POST', body: { source: project.value?.content } }).then(r => r.html))

// Gallery: thumbnail first, then the rest of the gallery (de-duped).
const galleryItems = computed(() => {
  const gallery = project.value?.gallery ?? []
  const thumb = project.value?.thumbnail
  if (!thumb) return gallery
  const thumbId = typeof thumb === 'string' ? thumb : thumb.id
  const rest = gallery.filter((g) => {
    const id = typeof g.directus_files_id === 'string' ? g.directus_files_id : g.directus_files_id?.id
    return id !== thumbId
  })
  return [{ directus_files_id: thumb }, ...rest]
})

useSeoMeta({
  title: () => `${project.value?.title} — Smidae`,
  description: () => project.value?.summary ?? null
})
</script>

<template>
  <UContainer
    v-if="project"
    class="py-8 max-w-6xl space-y-8"
  >
    <nav class="text-sm flex items-center gap-2 text-muted">
      <NuxtLink
        to="/projects"
        class="hover:underline"
      >
        Projects
      </NuxtLink>
      <span>/</span>
      <span class="text-foreground">{{ project.title }}</span>
    </nav>

    <div class="grid lg:grid-cols-2 gap-8">
      <CatalogGallery :items="galleryItems" />
      <div class="space-y-4">
        <h1 class="text-3xl font-bold">
          {{ project.title }}
        </h1>
        <p
          v-if="project.summary"
          class="text-lg text-muted"
        >
          {{ project.summary }}
        </p>
        <ProjectsBom :items="project.components ?? []" />
      </div>
    </div>

    <section v-if="project.content">
      <h2 class="text-xl font-semibold mb-3">
        Build guide
      </h2>
      <MarkdownBlock :html="contentHtml" />
    </section>
  </UContainer>
</template>
