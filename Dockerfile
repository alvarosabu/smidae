# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/.output /app/.output
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
