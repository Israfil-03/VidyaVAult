# VidyaVault

VidyaVault is a full-stack TypeScript monorepo for tuition test management, analytics, and rewards with strict RBAC across **superadmin**, **teacher_admin**, and **student** roles.

## Stack

- **Client:** React + TypeScript + Vite
- **Server:** Express + TypeScript
- **Database:** PostgreSQL + Prisma
- **Auth:** JWT + bcrypt

## Repository Structure

- `client/` - SPA with role-based routes and dashboard flows
- `server/` - Express API with Prisma models, RBAC, reward service, and AI stubs

## Environment

1. Copy `.env.example` to `.env` at the repository root.
2. Fill required values (`DATABASE_URL`, `JWT_SECRET`, etc).

## Install

```bash
npm install
```

## Database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Run in Development

```bash
npm run dev
```

- Client: `http://localhost:5173`
- API: `http://localhost:4000/api`

## UI-only Preview (No Backend)

For local UI walkthrough without backend auth/API:

1. Create `client/.env.local`
2. Add:

```bash
VITE_UI_ONLY=true
```

Then run:

```bash
npm run dev -w client
```

Open:
- `/superadmin`
- `/teacher`
- `/student`

This mode is dev-only (`import.meta.env.DEV`) and does not affect production unless you explicitly enable the flag.

## Build and Test

```bash
npm run test
npm run build
```

## Seeded Superadmin Credentials

- Email: `israfilhoque523@gmail.com`
- Password: `Israfil@860974`

## AI Integration Notes

- `/api/ai/generate-questions` is wired for teacher/superadmin use.
- `/api/ai/analyse-performance` is internal-token protected.
- Gemini calls are stubbed with clear TODO markers for production integration.

## Deployment Notes

- TODO: Add Azure Static Web Apps / App Service deployment manifests and CI/CD workflow files.
