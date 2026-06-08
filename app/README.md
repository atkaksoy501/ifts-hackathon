# Predictive Sizing + Blockage Advisor

Module 1 app scaffold.

## Stack

- Backend: Express, TypeScript, MongoDB, httpOnly JWT cookie auth, Vitest/Supertest.
- Frontend: React, Vite, TypeScript, Tailwind CSS, shadcn-style local UI, Radix primitives, TanStack Query.
- Shared contracts: `@module1/contracts` DTOs and Zod schemas.
- Runtime: single Docker image serving API and built frontend.

## Commands

Use Node `>=22` (`.node-version` is `22`). On this machine the default `node` was `v14`, so the scaffold was verified with the bundled Node `v24.14.0`.

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm build
corepack pnpm docker:up
```

Backend listens on `http://localhost:8080`. Frontend dev server listens on `http://localhost:5173`.
