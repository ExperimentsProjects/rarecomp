import { Pool } from 'pg';

/**
 * Idempotent schema provisioning.
 *
 * Creates every table the store needs on first use, once per process. This makes
 * fresh hosted databases "just work" after deploy — no manual drizzle-kit push
 * required. Every statement is CREATE TABLE IF NOT EXISTS, so it is always safe.
 */

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS sections (
    id text PRIMARY KEY,
    name text NOT NULL,
    "order" integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    section_id text,
    price integer NOT NULL,
    old_price integer,
    image text,
    preview text NOT NULL DEFAULT 'dashboard',
    specs jsonb NOT NULL DEFAULT '[]'::jsonb,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    badge text,
    featured boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT true,
    source text,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    id text PRIMARY KEY,
    name text NOT NULL DEFAULT 'Owner',
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token text PRIMARY KEY,
    admin_id text NOT NULL,
    expires_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    token text PRIMARY KEY,
    user_id text NOT NULL,
    expires_at timestamp NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    token text UNIQUE NOT NULL,
    user_id text,
    name text NOT NULL,
    email text NOT NULL,
    items jsonb NOT NULL,
    total integer NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    address text,
    city text,
    state text,
    pincode text,
    shipping text NOT NULL DEFAULT 'processing',
    courier text,
    tracking_url text,
    shipping_updated_at timestamp,
    payment_id text,
    razorpay_order_id text,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id text PRIMARY KEY,
    product_id text NOT NULL,
    user_id text NOT NULL,
    user_name text NOT NULL,
    rating integer NOT NULL,
    title text,
    comment text NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key text PRIMARY KEY,
    value text NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS subscribers (
    email text PRIMARY KEY,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
];

function humaniseDbError(input: string): string {
  if (/ENOTFOUND|ECONNREFUSED|timeout|ETIMEDOUT|whitelist|Connection terminated/i.test(input))
    return 'The app could not reach PostgreSQL. Check the DATABASE_URL host, that the database service is running, and that your password has no unescaped special characters.';
  if (/password authentication failed/i.test(input))
    return 'PostgreSQL rejected the password in DATABASE_URL. Replace it with the exact connection string from your database provider (Neon/Supabase/Railway → Connect).';
  if (/SSL|certificate/i.test(input))
    return 'PostgreSQL requires SSL. This app enables it automatically for hosted URLs — double-check the DATABASE_URL is the hosted connection string, not localhost.';
  return input.slice(0, 300);
}

export type DbReadiness = { ok: boolean; error?: string };

let ddlPromise: Promise<DbReadiness> | undefined;

/**
 * Checks database readiness and provisions tables if needed.
 * NEVER crashes API routes — returns a status object so routes can decide
 * whether to continue gracefully and let an inner try-catch produce
 * proper JSON responses.
 */
export async function dbReady(): Promise<DbReadiness> {
  // Accept either Vercel-provided name so the Neon/Postgres integration always works.
  // Strip channel_binding param which can cause issues with some pg driver versions.
  const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const url = rawUrl?.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?$/, '');
  if (!url) {
    console.error('[DB] DATABASE_URL / POSTGRES_URL are not set in hosting environment.');
    return {
      ok: false,
      error:
        "DATABASE_URL is not set in your hosting environment. In Vercel: Project → Settings → Environment Variables → add DATABASE_URL with the **hosted** PostgreSQL URL (Neon/Supabase/Railway, NOT 127.0.0.1 — Vercel's servers can't reach localhost), then click Redeploy. If you connected the Vercel Neon integration, also confirm POSTGRES_URL exists as it's injected automatically.",
    };
  }
  if (!ddlPromise) {
    ddlPromise = (async (): Promise<DbReadiness> => {
      const needsSsl = !/localhost|127\.0\.0\.1/.test(url);
      let pool: Pool | null = null;
      try {
        pool = new Pool({
          connectionString: url,
          ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
          max: 2,
          connectionTimeoutMillis: 8000,
          idleTimeoutMillis: 5000,
        });
        for (const statement of DDL) await pool.query(statement);
        return { ok: true };
      } catch (e) {
        ddlPromise = undefined; // retry on next request
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[DB] Initialization failed:', msg);
        return { ok: false, error: humaniseDbError(msg) };
      } finally {
        try {
          await pool?.end();
        } catch {/* ignore */}
      }
    })();
  }
  return ddlPromise;
}
