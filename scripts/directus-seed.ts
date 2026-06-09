import 'dotenv/config'
import {
  createDirectus, rest, staticToken,
  createItem, readItems, uploadFiles
} from '@directus/sdk'
import { File } from 'node:buffer'

const url = process.env.PUBLIC_URL ?? 'http://localhost:8055'
const token = process.env.ADMIN_TOKEN
if (!token) throw new Error('ADMIN_TOKEN env var required')

const client = createDirectus(url).with(rest()).with(staticToken(token))

const log = (msg: string) => console.log(`  • ${msg}`)
const section = (msg: string) => console.log(`› ${msg}`)

async function findBySlug<T extends { id: string }>(collection: string, slug: string): Promise<T | null> {
  const items = await client.request(readItems(collection as never, {
    filter: { slug: { _eq: slug } } as never,
    limit: 1
  })) as T[]
  return items[0] ?? null
}

async function findByName<T extends { id: string }>(collection: string, name: string): Promise<T | null> {
  const items = await client.request(readItems(collection as never, {
    filter: { name: { _eq: name } } as never,
    limit: 1
  })) as T[]
  return items[0] ?? null
}

async function ensureCategory(name: string, slug: string, icon?: string, sort?: number) {
  const existing = await findBySlug<{ id: string }>('categories', slug)
  if (existing) {
    log(`skip category ${slug}`)
    return existing
  }
  const created = await client.request(createItem('categories' as never, { name, slug, icon: icon ?? null, sort: sort ?? null } as never)) as { id: string }
  log(`create category ${slug}`)
  return created
}

async function ensureTag(name: string) {
  const existing = await findByName<{ id: string }>('tags', name)
  if (existing) {
    log(`skip tag ${name}`)
    return existing
  }
  const created = await client.request(createItem('tags' as never, { name } as never)) as { id: string }
  log(`create tag ${name}`)
  return created
}

async function uploadPlaceholder(filename: string, color: string, label: string): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="-apple-system,sans-serif" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  const form = new FormData()
  form.append('file', new File([svg], `${filename}.svg`, { type: 'image/svg+xml' }))
  const uploaded = await client.request(uploadFiles(form)) as { id: string }
  return uploaded.id
}

async function ensureComponent(input: {
  slug: string
  name: string
  category: string
  availability?: 'available' | 'eol' | 'discontinued'
  manufacturer?: string
  part_number?: string
  quantity?: number
  location?: string
  price?: number
  overview?: string
  features?: Array<{ title: string, description: string, icon?: string }>
  specs?: Array<{ label: string, value: string }>
  galleryColor?: string
  tagIds?: string[]
}) {
  const existing = await findBySlug<{ id: string }>('components', input.slug)
  if (existing) {
    log(`skip component ${input.slug}`)
    return existing
  }
  const galleryFileId = input.galleryColor
    ? await uploadPlaceholder(input.slug, input.galleryColor, input.name)
    : null

  const payload: Record<string, unknown> = {
    status: 'published',
    availability: input.availability ?? 'available',
    name: input.name,
    slug: input.slug,
    category: input.category,
    manufacturer: input.manufacturer ?? null,
    part_number: input.part_number ?? null,
    quantity: input.quantity ?? 1,
    location: input.location ?? null,
    price: input.price ?? null,
    overview: input.overview ?? null,
    features: input.features ?? null,
    specs: input.specs ?? null
  }
  if (galleryFileId) payload.gallery = [{ directus_files_id: galleryFileId }]
  if (input.tagIds?.length) payload.tags = input.tagIds.map(id => ({ tags_id: id }))

  const created = await client.request(createItem('components' as never, payload as never)) as { id: string }
  log(`create component ${input.slug}`)
  return created
}

async function ensureTutorial(input: {
  slug: string
  title: string
  summary: string
  content: string
  componentIds: string[]
}) {
  const existing = await findBySlug<{ id: string }>('tutorials', input.slug)
  if (existing) {
    log(`skip tutorial ${input.slug}`)
    return existing
  }
  const payload: Record<string, unknown> = {
    status: 'published',
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    content: input.content,
    date_published: new Date().toISOString(),
    components: input.componentIds.map(id => ({ components_id: id }))
  }
  const created = await client.request(createItem('tutorials' as never, payload as never)) as { id: string }
  log(`create tutorial ${input.slug}`)
  return created
}

async function ensureProject(input: {
  slug: string
  title: string
  summary: string
  content: string
  components: Array<{ id: string, quantity: number }>
  galleryColor?: string
}) {
  const existing = await findBySlug<{ id: string }>('projects', input.slug)
  if (existing) {
    log(`skip project ${input.slug}`)
    return existing
  }
  const thumbnailId = input.galleryColor
    ? await uploadPlaceholder(input.slug, input.galleryColor, input.title)
    : null

  const payload: Record<string, unknown> = {
    status: 'published',
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    content: input.content,
    components: input.components.map(c => ({ components_id: c.id, quantity: c.quantity }))
  }
  if (thumbnailId) {
    payload.thumbnail = thumbnailId
    payload.gallery = [{ directus_files_id: thumbnailId }]
  }
  const created = await client.request(createItem('projects' as never, payload as never)) as { id: string }
  log(`create project ${input.slug}`)
  return created
}

async function main() {
  section('categories')
  const boards = await ensureCategory('Boards', 'boards', 'memory', 1)
  const sensors = await ensureCategory('Sensors', 'sensors', 'sensors', 2)
  await ensureCategory('Passive', 'passive', 'tune', 3)

  section('tags')
  const arduino = await ensureTag('arduino')
  const esp32 = await ensureTag('esp32')
  const wifi = await ensureTag('wifi')
  const bluetooth = await ensureTag('bluetooth')
  const temperature = await ensureTag('temperature')

  section('components')
  const uno = await ensureComponent({
    slug: 'arduino-uno-r3',
    name: 'Arduino Uno R3',
    category: boards.id,
    availability: 'eol',
    manufacturer: 'Arduino',
    part_number: 'A000066',
    quantity: 3,
    location: 'Box A1',
    price: 24.9,
    overview: '# Arduino Uno R3\n\nThe Uno is the most-used board in the Arduino family. ATmega328P at 16 MHz with 14 digital I/O pins (6 PWM-capable) and 6 analog inputs.',
    features: [
      { title: 'ATmega328P MCU', description: '16 MHz, 32 KB flash, 2 KB SRAM', icon: 'cpu' },
      { title: '14 Digital I/O', description: '6 with PWM output' },
      { title: 'USB-B', description: 'Programming + serial via on-board USB-to-UART' }
    ],
    specs: [
      { label: 'Operating voltage', value: '5 V' },
      { label: 'Input voltage', value: '7-12 V' },
      { label: 'Flash memory', value: '32 KB' },
      { label: 'Clock speed', value: '16 MHz' }
    ],
    galleryColor: '#00979d',
    tagIds: [arduino.id]
  })

  const esp = await ensureComponent({
    slug: 'esp32-devkit-v1',
    name: 'ESP32 DevKit V1',
    category: boards.id,
    manufacturer: 'Espressif',
    part_number: 'ESP32-WROOM-32',
    quantity: 5,
    location: 'Box A2',
    price: 8.5,
    overview: '# ESP32 DevKit V1\n\nDual-core Xtensa LX6 with Wi-Fi and Bluetooth 4.2. Great for IoT projects.',
    features: [
      { title: 'Wi-Fi + Bluetooth', description: '802.11 b/g/n and BLE 4.2' },
      { title: 'Dual core', description: '240 MHz Xtensa LX6' },
      { title: '36 GPIOs', description: 'PWM, ADC, DAC, I2C, SPI, UART' }
    ],
    specs: [
      { label: 'Operating voltage', value: '3.3 V' },
      { label: 'Flash', value: '4 MB' },
      { label: 'Cores', value: '2' },
      { label: 'Clock speed', value: '240 MHz' }
    ],
    galleryColor: '#e7352c',
    tagIds: [esp32.id, wifi.id, bluetooth.id]
  })

  const dht = await ensureComponent({
    slug: 'dht22',
    name: 'DHT22 Temperature & Humidity Sensor',
    category: sensors.id,
    manufacturer: 'Aosong',
    part_number: 'AM2302',
    quantity: 4,
    location: 'Box B1',
    price: 3.75,
    overview: 'Digital temperature & humidity sensor using a single-wire protocol.',
    features: [
      { title: 'Temperature range', description: '-40 to 80 °C, ±0.5 °C' },
      { title: 'Humidity range', description: '0-100% RH, ±2-5%' }
    ],
    specs: [
      { label: 'Supply voltage', value: '3.3-5.5 V' },
      { label: 'Interface', value: 'Single-wire digital' },
      { label: 'Sampling rate', value: '0.5 Hz' }
    ],
    galleryColor: '#1f6feb',
    tagIds: [temperature.id]
  })

  section('tutorials')
  await ensureTutorial({
    slug: 'blink-arduino',
    title: 'Blink — Arduino Hello World',
    summary: 'The canonical first sketch: blink the on-board LED.',
    content: '# Blink\n\nThe simplest Arduino program. Sets up `LED_BUILTIN` as an output and toggles it every 500 ms.\n\n```cpp\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(500);\n}\n```\n\nUpload it via the Arduino IDE and watch the on-board LED blink.',
    componentIds: [uno.id]
  })

  await ensureTutorial({
    slug: 'esp32-wifi',
    title: 'Connecting ESP32 to Wi-Fi',
    summary: 'Bootstrap an ESP32 onto your local Wi-Fi network.',
    content: '# ESP32 Wi-Fi\n\nUse `WiFi.begin(ssid, password)` in `setup()` and poll `WiFi.status()` until `WL_CONNECTED`.\n\n```cpp\n#include <WiFi.h>\n\nconst char* ssid = "your-ssid";\nconst char* password = "your-password";\n\nvoid setup() {\n  Serial.begin(115200);\n  WiFi.begin(ssid, password);\n  while (WiFi.status() != WL_CONNECTED) {\n    delay(500);\n    Serial.print(".");\n  }\n  Serial.println(WiFi.localIP());\n}\n\nvoid loop() {}\n```',
    componentIds: [esp.id]
  })

  section('projects')
  await ensureProject({
    slug: 'wifi-weather-station',
    title: 'Wi-Fi Weather Station',
    summary: 'An ESP32 reads temperature and humidity and pushes the data to your network.',
    content: '# Wi-Fi Weather Station\n\nA small IoT build: an ESP32 polls a DHT22 sensor and serves the readings over Wi-Fi.\n\n## Wiring\n\n- DHT22 data pin → ESP32 GPIO 4 (with a 10k pull-up to 3.3 V)\n- DHT22 VCC → 3.3 V, GND → GND\n\n## Sketch\n\n```cpp\n#include <WiFi.h>\n#include <DHT.h>\n\nDHT dht(4, DHT22);\n\nvoid setup() {\n  Serial.begin(115200);\n  dht.begin();\n}\n\nvoid loop() {\n  Serial.printf("%.1f C  %.1f %%\\n", dht.readTemperature(), dht.readHumidity());\n  delay(2000);\n}\n```',
    components: [
      { id: esp.id, quantity: 1 },
      { id: dht.id, quantity: 2 }
    ],
    galleryColor: '#0ea5e9'
  })

  console.log('seed complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
