# HCM Lite backend

This folder contains the standalone Express API, Prisma MongoDB schema, authentication helpers, business rules, and services.

## Run

From the repository root, configure `DATABASE_URL` and `JWT_SECRET` in `.env`, then run:

```sh
npm run db:generate
npm run db:push
npm run backend:dev
```

The API listens on port `4100` by default. The Next.js app proxies `/api/*` to it. For both web and API in development, run `npm run dev:all` at the repository root. MongoDB must be reachable and configured as a replica set because the app uses transactions.

## Layout

- `server.ts`: Express startup, JSON/cookie middleware, and error handling.
- `routes.ts`: REST endpoints and request-level access checks.
- `services.ts`, `rules.ts`, `audit.ts`: database operations, business rules, and audit records.
- `auth-core.ts`: password hashing, JWTs, and session verification.
- `ai.ts`: optional server-side AI endpoints and tools.
- `prisma/schema.prisma`: MongoDB data model.
