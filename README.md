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
pnpm directus:start &            # backend on http://localhost:8055
pnpm directus:schema:apply       # apply committed snapshot
pnpm seed                        # one-time sample data
pnpm dev                         # frontend on http://localhost:3000
```

Directus admin: http://localhost:8055/admin (log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`).

## Scripts

- `pnpm dev` — Nuxt dev server
- `pnpm build` — production Nuxt build
- `pnpm test` — vitest
- `pnpm typecheck` — Nuxt + vue-tsc typecheck
- `pnpm lint` — eslint
- `pnpm seed` — populate sample data (idempotent)
- `pnpm directus:start` — start Directus locally
- `pnpm directus:bootstrap` — initialize Directus DB + admin user
- `pnpm directus:schema:apply` — apply committed snapshot to a fresh Directus
- `pnpm directus:schema:snapshot` — capture current schema to `directus/snapshot.yaml`
- `pnpm directus:schema:bootstrap` — alternative: re-create schema from the SDK script

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
scripts/
  directus-schema.ts          Schema-as-code bootstrap
  directus-seed.ts            Sample data
directus/
  snapshot.yaml               Schema snapshot (committed)
  database/, uploads/         Runtime data (gitignored)
docs/
  deployment.md
```
