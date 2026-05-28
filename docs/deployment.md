# Deployment

## Local development (no Docker)
```bash
cp .env.example .env  # then edit secrets
pnpm install
pnpm directus:bootstrap         # one-time admin/db setup
pnpm directus:start &           # backend on :8055
pnpm seed                       # one-time sample data
pnpm dev                        # frontend on :3000
```

## Production via Docker
Requires Docker 24+ and Docker Compose v2.

```bash
cp .env.example .env
# Generate strong secrets:
node -e "console.log('KEY=' + require('crypto').randomUUID()); console.log('SECRET=' + require('crypto').randomBytes(48).toString('hex')); console.log('ADMIN_TOKEN=' + require('crypto').randomBytes(32).toString('hex'))"
# Paste the generated values into .env.

docker compose up -d --build
```

The stack:
- `directus` (port 8055) — admin UI, REST/GraphQL API
- `nuxt` (port 3000) — public-facing catalog

On a fresh deployment you'll want to apply the committed schema:
```bash
docker compose exec directus npx directus schema apply --yes /directus/snapshot.yaml
```

Then seed sample data from outside the container:
```bash
ADMIN_TOKEN=$(grep ADMIN_TOKEN .env | cut -d'=' -f2) PUBLIC_URL=http://localhost:8055 pnpm seed
```

## Persistent data
- `directus/database/data.db` — SQLite DB. Back this up.
- `directus/uploads/` — uploaded images and PDFs.

## Backups
```bash
tar czf smidae-backup-$(date +%F).tar.gz directus/database directus/uploads
```
Restore: stop the stack, extract the tarball over `directus/`, restart.

## Schema changes
1. Edit collections in the Directus admin (`http://localhost:8055/admin`).
2. Capture: `pnpm directus:schema:snapshot` (local) or `docker compose exec directus npx directus schema snapshot --yes /directus/snapshot.yaml`.
3. Commit `directus/snapshot.yaml`.

## Cloudflare Pages
Not supported. The app depends on a persistent SQLite file and on-disk uploads served by Directus; Cloudflare Pages/Workers can't host that stateful backend. Deploy on a VPS, Fly.io, Render, Railway, or any host that supports Docker volumes — or use Directus Cloud for the backend and host the Nuxt frontend on Pages (would require swapping the runtime config to point at the cloud URL).
