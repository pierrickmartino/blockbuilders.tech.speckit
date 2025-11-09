# syntax = docker/dockerfile:1.7

FROM node:20.19-bullseye AS base

ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json

RUN --mount=type=cache,id=frontend-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter ./apps/frontend...

CMD ["pnpm", "--filter", "./apps/frontend...", "dev", "--hostname", "0.0.0.0"]
