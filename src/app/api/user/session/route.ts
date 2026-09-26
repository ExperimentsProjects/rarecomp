import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { userSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUser, createUserSession, tokenHash, sameOrigin } from '@/lib/auth';
import { findUserByEmail, userExists, createUserRecord, recordLogin } from '@/lib/user-store';
import { verifyPassword } from '@/lib/auth-crypto';
import { dbReady } from '@/db/schema-ddl';

export async function GET() {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    const user = await getUser();
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    
    const meta = { ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '', userAgent: req.headers.get('user-agent') || '' };
    const { mode, name, email, password } = await req.json();
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128)
      return NextResponse.json({ error: 'Enter a valid email and a password of at least 8 characters.' }, { status: 400 });
    const key = email.trim().toLowerCase().slice(0, 254);

    if (mode === 'signup') {
      if (typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
      if (await userExists(key)) return NextResponse.json({ error: 'An account already exists for this email. Try signing in.' }, { status: 409 });
      const id = await createUserRecord(name, key, password);
      await recordLogin(id, key, 'signup', meta);
      const token = await createUserSession(id, req);
      return NextResponse.json({ success: true, token }, { status: 201 });
    }

    const user = await findUserByEmail(key);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      await recordLogin(null, key, 'failed', meta);
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }
    await recordLogin(user.id, key, 'login', meta);
    const token = await createUserSession(user.id, req);
    return NextResponse.json({ success: true, token });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    const jar = await cookies();
    const token = jar.get('ep_user')?.value || req.headers.get('x-user-session') || undefined;
    if (token && /^[a-f0-9]{64}$/i.test(token)) {
      const [row] = await db.select().from(userSessions).where(eq(userSessions.token, tokenHash(token)));
      if (row) await recordLogin(row.userId, '', 'logout');
      await db.delete(userSessions).where(eq(userSessions.token, tokenHash(token)));
    }
    jar.delete('ep_user');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
