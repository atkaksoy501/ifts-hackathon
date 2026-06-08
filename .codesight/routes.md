# Routes

## CRUD Resources

- **`/api/admin/users`** GET | POST | GET/:id | PATCH/:id → User
- **`/api/admin/blockage-patterns`** GET | POST | GET/:id | PATCH/:id → Blockage-pattern

## Other Routes

- `GET` `/healthz` `[inferred]` ✓
- `GET` `*` `[inferred]` ✓
- `POST` `/api/auth/login` [auth] `[inferred]` ✓
- `POST` `/api/auth/logout` [auth] `[inferred]`
- `GET` `/api/auth/me` [auth] `[inferred]` ✓
- `GET` `/api/sync/status` [auth] `[inferred]`
- `POST` `/api/sync/github/run` [auth] `[inferred]`
- `GET` `/api/backlog` [auth] `[inferred]`
- `GET` `/api/sprints/history` [auth] `[inferred]`
- `POST` `/api/sizing/recommend` [auth] `[inferred]` ✓
- `POST` `/api/blockage/recommend` [auth] `[inferred]`
