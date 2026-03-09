# Coffee @ Yellowhauz POS (Vercel + React + Node + PostgreSQL)

## Prerequisites
- Node.js (LTS recommended)
- A PostgreSQL database (local or hosted)

## Environment Variables
Set the following:
- `DATABASE_URL` (PostgreSQL connection string)

## Install
From repo root:
- `npm install`

## Prisma
- `npm run db:generate`
- `npm run db:migrate`

## Run (local)
Frontend:
- `npm run dev`

API health (Vercel functions):
- Deploy to Vercel, or run your own local server in `apps/api` (currently only a minimal /api/health stub in dev server).

## Deploy to Vercel
- Import the repo in Vercel
- Add `DATABASE_URL` in Vercel Project Settings → Environment Variables
- Deploy
