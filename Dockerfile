FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable

COPY app/package.json app/pnpm-workspace.yaml ./
COPY app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY app/shared/package.json shared/package.json
COPY app/backend/package.json backend/package.json
COPY app/frontend/package.json frontend/package.json

RUN pnpm install --frozen-lockfile

COPY app/ ./
RUN pnpm build
RUN pnpm --filter @module1/backend deploy --legacy --prod /prod/backend

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=8080
ENV FRONTEND_DIST=../frontend/dist
WORKDIR /app/backend

COPY --from=build /prod/backend ./
COPY --from=build /app/frontend/dist /app/frontend/dist

EXPOSE 8080
CMD ["node", "dist/server.js"]
