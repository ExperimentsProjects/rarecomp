# Experiments_Projects

Responsive Indian electronics-component ecommerce website built with Next.js App Router, React, PostgreSQL/Drizzle, MongoDB Atlas, Razorpay, and Vercel Blob.

## Vercel quick start

This repository is already arranged as a **single Next.js application at the repository root**.

Use these Vercel import settings:

- **Framework Preset:** Next.js
- **Root Directory:** `./` (repository root)
- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Output Directory:** leave blank
- **Node.js:** 22.x

Do not upload `.next`, `node_modules`, `.env`, `uploads`, or `artifacts`. They are excluded by `.gitignore` and `.vercelignore`.

## Required environment variables

Copy `.env.example` values into **Vercel → Project → Settings → Environment Variables**:

- `DATABASE_URL` — hosted PostgreSQL, never localhost
- `MONGODB_URI` — MongoDB Atlas connection URI
- `MONGODB_DATABASE` — `experiments_projects`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `BLOB_READ_WRITE_TOKEN` — automatically created when Vercel Blob is connected

Never commit `.env`.

## Database schema

After creating the Vercel project and hosted PostgreSQL database, apply the schema once from your computer:

```bash
DATABASE_URL="YOUR_PRODUCTION_POSTGRES_URL" npx drizzle-kit push
```

The Drizzle config reads `DATABASE_URL`; it does not contain a localhost URL.

## Local development

```bash
cp .env.example .env
# replace placeholders with local values
npm ci
npx drizzle-kit push
npm run dev
```

## Verify before GitHub/Vercel

```bash
node scripts/check-vercel-ready.mjs
npm run build
```

See `VERCEL_DEPLOYMENT.md` for the full deployment procedure.
