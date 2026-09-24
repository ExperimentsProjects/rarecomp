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

let ddlPromise: Promise<void> | undefined;

export async function dbReady() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set in your hosting environment. In Railway or Vercel, open your app service → Variables → add DATABASE_URL with the full PostgreSQL connection URL from your database Connect page (host must not be 127.0.0.1), then redeploy.',
    );
  }
  if (!ddlPromise) {
    ddlPromise = (async () => {
      const needsSsl = !/localhost|127\.0\.0\.1/.test(url);
      const pool = new Pool({
        connectionString: url,
        ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
        max: 2,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
      });
      try {
        for (const statement of DDL) await pool.query(statement);
      } finally {
        await pool.end().catch(() => {});
      }
    })().catch((e) => {
      ddlPromise = undefined; // allow retry on next request
      throw new Error(humaniseDbError(e instanceof Error ? e.message : String(e)));
    });
  }
  await ddlPromise;
}
