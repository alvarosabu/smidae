/**
 * One-off: attach datasheet/schematic PDFs to an existing component draft.
 * Imports each PDF into Directus files, then sets the component's `datasheets` M2M.
 *
 * Usage: npx tsx scripts/attach-datasheets.ts
 */

import 'dotenv/config'
import { createDirectus, rest, staticToken, importFile, updateItem } from '@directus/sdk'

const url = process.env.PUBLIC_URL ?? 'http://localhost:8055'
const adminToken = process.env.ADMIN_TOKEN
if (!adminToken) throw new Error('ADMIN_TOKEN required (set in .env)')

const COMPONENT_ID = 'ad4e9c1c-3319-4d4d-b23c-7eab70cb728f' // esp32-devkit-v1

const PDFS: Array<{ title: string, url: string }> = [
  {
    title: 'ESP32 DevKit V1 — ESP32-WROOM-32 Module Datasheet',
    url: 'https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf'
  },
  {
    title: 'ESP32 DevKit V1 — ESP32 Series SoC Datasheet',
    url: 'https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf'
  },
  {
    title: 'ESP32 DevKit V1 — DOIT Pinout (CircuitState)',
    url: 'https://www.circuitstate.com/wp-content/uploads/2022/12/ESP32-DevKit-V1-Pinout-r0.1-CIRCUITSTATE-Electronics.pdf'
  }
]

const client = createDirectus(url).with(rest()).with(staticToken(adminToken))

async function main(): Promise<void> {
  const fileIds: string[] = []
  for (const { title, url: pdfUrl } of PDFS) {
    try {
      const file = await client.request<{ id: string }>(importFile(pdfUrl, { title } as never))
      fileIds.push(file.id)
      console.log(`  ✓ imported: ${title} (${file.id})`)
    } catch (err) {
      console.error(`  ✗ failed: ${pdfUrl} — ${(err as Error).message}`)
    }
  }

  if (!fileIds.length) {
    console.error('No files imported; leaving component untouched.')
    process.exit(1)
  }

  await client.request(
    updateItem('components' as never, COMPONENT_ID, {
      datasheets: fileIds.map(id => ({ directus_files_id: id }))
    } as never)
  )
  console.log(`\n✓ attached ${fileIds.length} datasheet(s) to component ${COMPONENT_ID}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
