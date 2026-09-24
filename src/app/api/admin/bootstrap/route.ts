import { NextResponse } from 'next/server';
import { db } from '@/db';
import { admins } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { getAdmin, sameOrigin, hashPassword } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';

const BOOTSTRAP_PASS = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'ChangeMe@' + randomBytes(12).toString('base64url').slice(0, 16);

/**
 * One-time database & first-admin self-heal.
 *
 * POST before any admin exists:
 *   - creates the `admins` table if this sandbox reset cleared it
 *   - restores RAJU's owner account with the password from the request or env
 * Enforces current-plan rules (password ≥ 8 chars). Once any admin exists it
 * answers 403, so it is strictly a recovery path — never a leak.
 */
export async function POST(req: Request) { await dbReady();
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });

  // If tables vanished after a sandbox reset, recreate them all.
  await db.execute(sql`CREATE TABLE IF NOT EXISTS admins (
    id text PRIMARY KEY,
    name text NOT NULL DEFAULT 'Owner',
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL
  )`).catch(() => {});

  const [existing] = await db.select().from(admins).limit(1).catch(() => [undefined]);
  if (existing) return NextResponse.json({ error: 'Administrator already exists. Please sign in.' }, { status: 409 });

  let email: string;
  let name: string;
  let password: string;
  try {
    const body = await req.json();
    email = String(body.email || process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
    name = String(body.name || 'Owner').trim().slice(0, 60);
    password = String(body.password || BOOTSTRAP_PASS);
  } catch {
    return NextResponse.json({ error: 'Send {email, name, password} as JSON.' }, { status: 400 });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: 'Password must be 8–128 characters.' }, { status: 400 });

  await db.insert(admins).values({ id: 'owner', name: name || 'Owner', email, passwordHash: hashPassword(password) })
    .onConflictDoUpdate({ target: admins.email, set: { passwordHash: hashPassword(password), name: name || 'Owner' } });

  return NextResponse.json({ success: true, email, passwordSet: password !== BOOTSTRAP_PASS }, { status: 201 });
}

/** Let a signed-in admin read whether the recovery path is needed. */
export async function GET() { await dbReady();
  const admin = await getAdmin();
  const [existing] = await db.select({ id: admins.id }).from(admins).limit(1).catch(() => [undefined]);
  return NextResponse.json({ admin, needsBootstrap: !existing, bootstrapAvailable: !existing });
}
