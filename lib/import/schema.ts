import { z } from 'zod'

export const featureSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional()
})

export const specSchema = z.object({
  label: z.string(),
  value: z.string()
})

export const extractedComponentSchema = z.object({
  name: z.string().describe('Human product name, e.g. "Arduino MKR 1000 WiFi"'),
  manufacturer: z.string().nullable(),
  part_number: z.string().nullable().describe('Manufacturer part number / MPN'),
  overview: z.string().describe('Concise markdown description, 2–4 short paragraphs'),
  features: z.array(featureSchema),
  specs: z.array(specSchema).describe('Electrical/mechanical specs as {label,value} with units'),
  availability: z
    .enum(['available', 'eol', 'discontinued'])
    .describe('Manufacturer lifecycle inferred from the page; default "available"'),
  category: z.string().describe('Best-fit category name, e.g. "Boards", "Sensors"'),
  tags: z.array(z.string()).describe('3–8 lowercase tags: protocols, form factor, family'),
  datasheetUrls: z.array(z.string()).describe('PDF URLs chosen ONLY from the provided candidate links'),
  imageUrls: z.array(z.string()).describe('Product image URLs chosen ONLY from the provided candidate images')
})

export type ExtractedComponent = z.infer<typeof extractedComponentSchema>
