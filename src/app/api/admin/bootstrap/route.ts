import { NextResponse } from 'next/server';
import { db } from '@/db';
import { admins } from '@/db/schema';
import { randomBytes } from 'crypto';
import { getAdmin, sameOrigin, hashPassword } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';

const BOOTSTRAP_PASS = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'ChangeMe@' + randomBytes(12).toString('base64url').slice(0, 16);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

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

    await db.insert(admins).values({ id: 'owner', name: name || 'RAJU', email, passwordHash: hashPassword(password) })
      .onConflictDoUpdate({ target: admins.email, set: { passwordHash: hashPassword(password), name: name || 'RAJU' } });

    return NextResponse.json({ success: true, email, passwordSet: password !== BOOTSTRAP_PASS }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ needsBootstrap: false, error: readiness.error });
    const admin = await getAdmin();
    const [existing] = await db.select({ id: admins.id }).from(admins).limit(1).catch(() => [undefined]);
    return NextResponse.json({ admin, needsBootstrap: !existing, bootstrapAvailable: !existing });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
