FROM node:20-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

FROM base AS development

ENV NODE_ENV=development

CMD ["pnpm", "--filter", "@rdcs/api", "dev"]
