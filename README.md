# Smidae — Electronic Component Catalog

Personal catalog of electronic components, boards, sensors, and tutorials.

**Stack:** Nuxt 4 + Nuxt UI 4 (frontend) · Directus (CMS + REST API) · SQLite · Docker (production).

## Features
- Catalog grid with search, category & tag filters, sort
- SparkFun-style component pages: gallery, features, specs table, datasheets, related tutorials
- Markdown overview per component, rendered with `marked`
- Tutorials with many-to-many links back to components
- Schema defined as code (`scripts/directus-schema.ts`) plus committed YAML snapshot (`directus/snapshot.yaml`) for reproducible setup
- Idempotent seed script with sample components and tutorials

## Quick start (local dev — no Docker)

Requires Node 22 (`.nvmrc` pinned), pnpm, and `fnm` or similar.

```bash
cp .env.example .env
# Generate strong secrets:
node -e "console.log('KEY=' + require('crypto').randomUUID()); console.log('SECRET=' + require('crypto').randomBytes(48).toString('hex')); console.log('ADMIN_TOKEN=' + require('crypto').randomBytes(32).toString('hex'))"
# Paste the generated values into .env (KEY, SECRET, ADMIN_TOKEN — and set ADMIN_PASSWORD).
# Also set NUXT_DIRECTUS_TOKEN to the same value as ADMIN_TOKEN.

pnpm install
pnpm directus:bootstrap          # one-time: creates SQLite DB + admin user
pnpm directus:start &            # backend on http://localhost:8056
pnpm directus:schema:apply       # apply committed snapshot
pnpm seed                        # one-time sample data
pnpm dev                         # frontend on http://localhost:3000
```

Directus admin: http://localhost:8056/admin (log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`). The port is set via `PORT=8056` in `.env` (Directus defaults to 8055 otherwise).

## Scripts

- `pnpm dev` — Nuxt dev server
- `pnpm build` — production Nuxt build
- `pnpm test` — vitest
- `pnpm typecheck` — Nuxt + vue-tsc typecheck
- `pnpm lint` — eslint
- `pnpm seed` — populate sample data (idempotent)
- `pnpm import <url> [<url> …]` — AI import a product from a link into a draft
- `pnpm directus:import:flow` — create the in-admin "Import from URL" Flow button
- `pnpm directus:start` — start Directus locally
- `pnpm directus:bootstrap` — initialize Directus DB + admin user
- `pnpm directus:schema:apply` — apply committed snapshot to a fresh Directus
- `pnpm directus:schema:snapshot` — capture current schema to `directus/snapshot.yaml`
- `pnpm directus:schema:bootstrap` — alternative: re-create schema from the SDK script

## AI product import

Turn a product URL into a draft `components` entry: scrape the page → one
structured LLM call (Vercel AI SDK + Claude) → deterministic Directus writes
(category/tags reused or created, datasheets/images imported, draft created).
Far cheaper than an agentic loop — only cleaned text reaches the model, and all
CRUD is plain code.

Two entry points share the same core in `lib/import/`:

- **CLI:** `pnpm import https://docs.arduino.cc/hardware/mkr-1000-wifi/`
- **HTTP:** `POST /api/import { "url": "…" }` with header `x-import-secret: $IMPORT_SECRET`
- **Directus button:** `pnpm directus:import:flow` adds an "Import from URL" manual
  Flow on the components collection that calls the endpoint.

Env vars (add to `.env`):

```
ANTHROPIC_API_KEY=sk-ant-...      # required for extraction
IMPORT_SECRET=<random>            # required to expose POST /api/import
IMPORT_MODEL=claude-haiku-4-5     # optional; default
SITE_URL=http://localhost:3000    # optional; where the Nuxt app runs (Flow target)
# reuses existing ADMIN_TOKEN and PUBLIC_URL
```

## Production (Docker)
See `docs/deployment.md`.

## Project layout

```
app/                          Nuxt 4 frontend
  components/
    catalog/                  Component-card, gallery, features, specs, datasheets, related
    tutorials/                Tutorial card
    MarkdownBlock.vue         Marked-powered renderer
  composables/
    useDirectus.ts            Typed SDK client
    useCatalog.ts             List / categories / tags queries
    useAssetUrl.ts            Asset URL builder with transforms
  pages/
    index.vue                 Catalog grid
    components/[slug].vue     Detail page
    tutorials/                Index + detail
  types/directus.ts           Schema types
lib/import/                   AI import core (scrape → extract → import), framework-agnostic
server/api/import.post.ts     Import HTTP endpoint (secret-guarded)
scripts/
  directus-schema.ts          Schema-as-code bootstrap
  directus-seed.ts            Sample data
  directus-import.ts          CLI: pnpm import <url>
  directus-import-flow.ts     Creates the in-admin "Import from URL" Flow
directus/
  snapshot.yaml               Schema snapshot (committed)
  database/, uploads/         Runtime data (gitignored)
docs/
  deployment.md
```
