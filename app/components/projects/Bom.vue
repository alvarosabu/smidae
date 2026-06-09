<script setup lang="ts">
import type { Component, ProjectComponent } from '~/types/directus'

const props = defineProps<{ items: ProjectComponent[] }>()

const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })

interface Line {
  id: string
  name: string
  slug: string | null
  needed: number
  inStock: number
  enough: boolean
  unitPrice: number | null
  lineCost: number | null
}

const lines = computed<Line[]>(() => (props.items ?? [])
  .map((row): Line | null => {
    const c = row.components_id
    if (!c || typeof c === 'string') return null
    const comp = c as Component
    const needed = row.quantity ?? 1
    const unitPrice = comp.price != null ? Number(comp.price) : null
    return {
      id: comp.id,
      name: comp.name,
      slug: comp.slug ?? null,
      needed,
      inStock: comp.quantity ?? 0,
      enough: (comp.quantity ?? 0) >= needed,
      unitPrice,
      lineCost: unitPrice != null ? unitPrice * needed : null
    }
  })
  .filter((l): l is Line => l !== null))

const totalCost = computed(() => lines.value.reduce((sum, l) => sum + (l.lineCost ?? 0), 0))
const hasMissingPrice = computed(() => lines.value.some(l => l.unitPrice == null))
const buildable = computed(() => lines.value.length > 0 && lines.value.every(l => l.enough))
</script>

<template>
  <div
    v-if="lines.length"
    class="space-y-3"
  >
    <div class="border rounded overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-muted/50 text-muted text-left">
          <tr>
            <th class="px-4 py-2 font-medium">
              Component
            </th>
            <th class="px-4 py-2 font-medium text-center">
              Needed
            </th>
            <th class="px-4 py-2 font-medium">
              Stock
            </th>
            <th class="px-4 py-2 font-medium text-right">
              Cost
            </th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr
            v-for="l in lines"
            :key="l.id"
          >
            <td class="px-4 py-2 font-medium">
              <NuxtLink
                v-if="l.slug"
                :to="`/components/${l.slug}`"
                class="hover:underline"
              >
                {{ l.name }}
              </NuxtLink>
              <span v-else>{{ l.name }}</span>
            </td>
            <td class="px-4 py-2 text-center text-muted">
              {{ l.needed }}
            </td>
            <td class="px-4 py-2">
              <span
                class="inline-flex items-center gap-1.5"
                :class="l.enough ? 'text-success' : 'text-error'"
              >
                <UIcon
                  :name="l.enough ? 'i-lucide-check' : 'i-lucide-x'"
                  class="size-4"
                />
                {{ l.enough ? `${l.inStock} in stock` : `${l.inStock} in stock · short` }}
              </span>
            </td>
            <td class="px-4 py-2 text-right tabular-nums">
              <span v-if="l.lineCost != null">{{ euro.format(l.lineCost) }}</span>
              <span
                v-else
                class="text-muted"
              >—</span>
            </td>
          </tr>
        </tbody>
        <tfoot class="border-t bg-muted/30">
          <tr>
            <td
              class="px-4 py-2 font-medium"
              colspan="3"
            >
              Total{{ hasMissingPrice ? ' (partial)' : '' }}
            </td>
            <td class="px-4 py-2 text-right font-semibold tabular-nums">
              {{ euro.format(totalCost) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <UBadge
      :color="buildable ? 'success' : 'warning'"
      variant="subtle"
      :icon="buildable ? 'i-lucide-package-check' : 'i-lucide-package-x'"
    >
      {{ buildable ? 'Buildable with current stock' : 'Missing parts for this build' }}
    </UBadge>
  </div>
  <UAlert
    v-else
    icon="i-lucide-info"
    color="neutral"
    variant="subtle"
    title="No components listed for this project."
  />
</template>
