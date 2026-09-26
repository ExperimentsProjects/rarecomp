import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Lazy, build-safe database client.
 *
 * Next.js imports every route/module while collecting page data at BUILD time,
 * when DATABASE_URL is not present yet. Connecting eagerly at import would crash
 * the build. This defers the connection until the first actual query at runtime.
 */

const globalForDb = globalThis as typeof globalThis & {
  __epPgPool?: Pool;
  __epPgDb?: NodePgDatabase;
};

function resolveDb(): NodePgDatabase {
  if (globalForDb.__epPgDb) return globalForDb.__epPgDb;

  // Vercel's Postgres integrations expose DATABASE_URL and/or POSTGRES_URL.
  // Strip channel_binding param which can cause issues with some pg driver versions.
  const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const databaseUrl = rawUrl?.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?$/, '');
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Add your hosted PostgreSQL connection string (Neon/Supabase/Railway) to the environment variables, then redeploy.",
    );
  }

  const needsSsl = !/localhost|127\.0\.0\.1/.test(databaseUrl);
  globalForDb.__epPgPool = new Pool({
    connectionString: databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  globalForDb.__epPgDb = drizzle(globalForDb.__epPgPool);
  return globalForDb.__epPgDb;
}

export const pool = globalForDb.__epPgPool;

/**
 * Proxy binding every call to the lazily-resolved client, preserving `this`.
 * Behavior is identical to a genuine Drizzle client for all queries.
 */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop: string | symbol) {
    const real = resolveDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});
