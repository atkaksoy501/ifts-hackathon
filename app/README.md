# Predictive Sizing + Blockage Advisor

Module 1 app for Predictive Sizing and Blockage Advisor.

## Stack

- Backend: Express, TypeScript, MongoDB, httpOnly JWT cookie auth, Vitest/Supertest.
- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn-style local UI, Radix primitives, TanStack Query.
- Shared contracts: `@module1/contracts` DTOs and Zod schemas.
- Runtime: single Docker image serving API and built frontend.

## Commands

Use Node `>=22` (`.node-version` is `22`). In this shell, Node `v26.0.0` and direct `pnpm` were available; `corepack` was not on `PATH`.

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm docker:up
```

Backend listens on `http://localhost:8080`. Frontend dev server listens on `http://localhost:5173`.

## Frontend Runbook

The frontend uses httpOnly cookie auth through the Vite `/api` proxy. Default local admin credentials:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin12345
```

Useful frontend checks:

```bash
pnpm --filter @module1/frontend test:unit
pnpm --filter @module1/frontend build
pnpm --filter @module1/frontend test:e2e
```

Playwright starts the existing backend and frontend dev scaffold. For deterministic e2e data, the frontend Playwright config starts the backend with:

```bash
CATALOG_STORE=memory SYNC_DISABLED=true SYNC_STARTUP_ENABLED=false
```

If Playwright browsers are missing:

```bash
pnpm --dir frontend exec playwright install chromium
```

## Sync and Ingest Notes

Production-style ingest remains read-only: Company PC publisher writes GitHub state, backend ingests GitHub state, and the frontend only calls backend REST routes. Manual sync is admin-only and can complete with warnings or failed status while preserving existing catalog data.

The e2e suite uses the deterministic in-memory catalog seed:

```bash
CATALOG_STORE=memory SYNC_DISABLED=true SYNC_STARTUP_ENABLED=false
```

Production/default mode uses MongoDB repositories with read-side DTO normalization for legacy rows that predate required arrays such as `sprintIds`, `labels`, and `components`.
