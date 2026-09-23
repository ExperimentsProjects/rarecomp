import { cookies, headers } from 'next/headers';
import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'crypto';
import { db } from '@/db';
import { sessions, admins, userSessions } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { findUserById, createUserRecord } from './user-store';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser clients (API calls) carry no Origin
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  if (originHost === request.headers.get('host')) return true;
  const forwarded = request.headers.get('x-forwarded-host') || '';
  // Behind multi-level proxies the external host is the first forwarded entry.
  return forwarded
    .split(',')
    .map((h) => h.trim())
    .includes(originHost);
}

/**
 * Never issue cookies the browser would silently drop: mark Secure only when
 * the outer connection is genuinely HTTPS (platform preview), allow plain
 * HTTP for local development.
 */
export function isSecureRequest(request: Request | null) {
  if (!request) return process.env.NODE_ENV === 'production';
  const proto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim();
  if (proto) return proto === 'https';
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

function cookieOptions(request: Request | null) {
  return { httpOnly: true as const, sameSite: 'strict' as const, secure: isSecureRequest(request), path: '/', maxAge: 60 * 60 * 24 * 14 };
}

async function headerToken(name: string) {
  const h = await headers();
  const value = h.get(name);
  return value && /^[a-f0-9]{64}$/i.test(value) ? value : null;
}

export async function getAdmin() {
  const token = (await cookies()).get('stackd_admin')?.value || (await headerToken('x-admin-session'));
  if (!token) return null;
  const [session] = await db.select().from(sessions).where(and(eq(sessions.token, tokenHash(token)), gt(sessions.expiresAt, new Date())));
  if (!session) return null;
  const [admin] = await db.select({ id: admins.id, name: admins.name, email: admins.email }).from(admins).where(eq(admins.id, session.adminId));
  return admin ?? null;
}

export async function createSession(id: string, request?: Request) {
  const token = randomBytes(32).toString('hex');
  await db.insert(sessions).values({ token: tokenHash(token), adminId: id, expiresAt: new Date(Date.now() + 86400000) });
  (await cookies()).set('stackd_admin', token, { ...cookieOptions(request ?? null), maxAge: 86400 });
  return token;
}

export async function getUser() {
  const token = (await cookies()).get('ep_user')?.value || (await headerToken('x-user-session'));
  if (!token) return null;
  const [session] = await db.select().from(userSessions).where(and(eq(userSessions.token, tokenHash(token)), gt(userSessions.expiresAt, new Date())));
  if (!session) return null;
  return findUserById(session.userId);
}

export async function createUser(user: { name: string; email: string; password: string }) {
  return createUserRecord(user.name, user.email, user.password);
}

export async function createUserSession(userId: string, request?: Request) {
  const token = randomBytes(32).toString('hex');
  await db.insert(userSessions).values({ token: tokenHash(token), userId, expiresAt: new Date(Date.now() + 14 * 86400000) });
  (await cookies()).set('ep_user', token, cookieOptions(request ?? null));
  return token;
}
