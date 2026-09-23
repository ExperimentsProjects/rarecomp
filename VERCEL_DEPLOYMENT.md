# Vercel deployment — exact steps

## 1. Download and unzip

The folder you push must directly contain:

```text
package.json
package-lock.json
vercel.json
next.config.ts
src/
public/
```

Do not put those files inside an extra nested folder unless that nested folder is selected as Vercel's Root Directory.

## 2. Verify locally

Run from the folder that contains `package.json`:

```bash
node scripts/check-vercel-ready.mjs
npm ci
npm run build
```

The checker must print `VERCEL READY`.

## 3. Push this exact folder to GitHub

```bash
git init -b main
git add .
git status
```

Confirm `.next`, `node_modules`, `.env`, `uploads`, and `artifacts` do **not** appear in `git status`.

Then:

```bash
git commit -m "Deploy Experiments_Projects"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

In GitHub, open the repository and confirm `package.json` is visible on the first page (repository root).

## 4. Create cloud services

### Hosted PostgreSQL

Create a PostgreSQL database in Neon, Supabase, or Vercel Marketplace. Copy the pooled connection URL and keep `sslmode=require` if the provider includes it.

### Vercel Blob

In Vercel project → Storage → Blob → Connect. Vercel creates `BLOB_READ_WRITE_TOKEN` automatically. Runtime admin image uploads use Blob; static images under `public/` require no setup.

### MongoDB Atlas

Use your Atlas connection string with database name `experiments_projects`. For Vercel's dynamic server IPs, Atlas Network Access must permit the Vercel deployment (the preview setup currently uses `0.0.0.0/0`; restrict it when moving to fixed-egress production hosting).

### Razorpay

Start with test keys. After checkout tests pass and Razorpay approves your website/policies, replace them with live keys.

## 5. Import into Vercel

Vercel → Add New → Project → Import your GitHub repository.

Set:

| Field | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `./` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | blank |
| Node.js Version | 22.x |

`vercel.json` also identifies the project as Next.js, but Root Directory is selected in the Vercel dashboard.

## 6. Add environment variables

Vercel → Project → Settings → Environment Variables. Add for Production (and Preview if needed):

```text
DATABASE_URL
MONGODB_URI
MONGODB_DATABASE
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
BLOB_READ_WRITE_TOKEN
ADMIN_BOOTSTRAP_EMAIL        (optional)
ADMIN_BOOTSTRAP_PASSWORD     (optional)
```

Use the values from your providers, not placeholders and not the sandbox localhost URL.

## 7. Deploy and apply the schema

Deploy once, then from your computer run:

```bash
DATABASE_URL="YOUR_PRODUCTION_POSTGRES_URL" npx drizzle-kit push
```

Redeploy afterward if the first deployment loaded before the tables existed.

## 8. Production checks

- `/api/health` returns `{ "ok": true }`
- Storefront lists hardware products
- `/admin` allows first-owner setup/sign-in
- Admin → Users shows MongoDB connected
- Admin → Settings → Test Razorpay confirms TEST or LIVE mode
- Product image upload returns a `blob.vercel-storage.com` URL
- Account signup and order checkout work
- Policy links all return 200

## Fix for “No Next.js version detected”

This folder already includes `next` in `dependencies`, `package-lock.json`, and `vercel.json`. If Vercel still reports the error:

1. In GitHub, verify `package.json` is visible at repository root.
2. In Vercel, set Root Directory to `./`.
3. Confirm Framework Preset is Next.js.
4. Confirm Production Branch is `main`.
5. Redeploy without build cache.

Do not upload only the `src` folder. The repository root must include `package.json`.

## Prove GitHub contains the right root — run before Vercel

Open a terminal inside the downloaded folder that contains `package.json` and run:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git add package.json package-lock.json vercel.json .gitignore .nvmrc
git commit -m "Ensure Vercel root package files are committed" || true
git push origin main
```

Then verify GitHub itself:

```bash
git ls-remote origin refs/heads/main >/dev/null
git ls-tree --name-only origin/main | grep -x 'package.json'
git ls-tree --name-only origin/main | grep -x 'package-lock.json'
git ls-tree --name-only origin/main | grep -x 'vercel.json'
```

All three grep commands must print the filename. If they print nothing, the repository Vercel is reading does not contain the files at root, and Vercel cannot deploy it.

In Vercel, also open **Project → Settings → Git** and confirm the connected repository is the same repository you just verified. If not, disconnect and import the correct one.

## If Vercel reads a nested default URL

If your GitHub repository page opens at a URL such as:

```text
https://github.com/USER/REPO/tree/main/apps/web
```

you are looking at a subfolder, not the real root. Navigate upward until the page displays the actual repository root. If the downloaded ZIP contains:

```text
Experiments_Projects-main/
  Experiments_Projects-main/
    package.json
```

do not push the outer folder. Move into the inner folder that contains `package.json`, and push from there, or set Vercel Root Directory exactly to that nested path.
