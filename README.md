# HCM Lite

HCM Lite is a web-based human capital management app for Admin, HR, and Employee roles. Next.js serves the web UI and proxies `/api/*` to the standalone Express service in `backend/`. The service applies role and employee-scope checks, runs shared business rules, and uses Prisma with MongoDB. The app starts with an empty database and first-run setup creates the company and Admin account.

## Requirements

- Node.js 20 or newer
- MongoDB Atlas cluster (the application uses MongoDB only)

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and replace `YOUR_MONGO_PASSWORD` in `DATABASE_URL` with your MongoDB user's password. Set a private `JWT_SECRET` of at least 32 random characters. Add `AI_API_KEY` for hosted AI features; the key stays on the server. Keep the full connection string only in `.env`, and URL-encode special characters in the username or password.
3. Sync the Prisma schema and generate the client: `npm run db:push`.
4. Start the frontend and API together: `npm run dev:all` and open <http://localhost:3000>. The API listens on port 4100 by default.
5. Complete the first-run setup to create the company and Admin. Optionally set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` to prefill the initial Admin credentials.

Allow the machine running the app in the Atlas network access list. The configured database name is `hcm_lite`. Do not commit `.env` or real credentials.

## Backend API

The standalone REST API and shared business rules are in `backend/`; it validates the signed-in user and role and applies employee data scoping. Next.js proxies browser requests to it through `BACKEND_URL`. `GET /api/health` checks MongoDB connectivity. Important endpoints include `/api/auth/*`, `/api/employees`, `/api/attendance/*`, `/api/leave`, `/api/payroll`, `/api/dashboards`, and `/api/ai/*`.

## Challenge coverage

- Implemented: first-run company/Admin setup, JWT sessions, three server-checked roles, organization settings, employee accounts and directory, attendance and correction APIs, leave approval and balance, payroll drafts/finalization, scoped dashboards, AI chat/summary/smart-leave APIs, announcements, notifications, and audit records.
- The employee directory, profile, attendance, dashboard, department, and payroll screens use live API data and show empty states for a fresh database.
- Optional camera attendance, face matching/liveness, a mobile app, and attrition/anomaly extras are not implemented. AI features require a compatible hosted LLM key and can be unavailable when no key is configured.

## Checks

- `npm run lint`
- `npm run build`
- `npm run db:generate`
- `npm run db:push` (requires a reachable MongoDB replica set)

The database starts empty. Employees, attendance, leave, payroll, dashboards, and AI answers should come from records entered through the application. Optional AI requires `AI_API_KEY`; without it, the rest of the app remains available.
