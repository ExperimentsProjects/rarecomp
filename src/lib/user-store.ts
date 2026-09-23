import { db } from '@/db';
import { users, userSessions } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import {
  isMongoReady,
  mongoFindUserByEmail,
  mongoFindUserById,
  mongoCreateUser,
  mongoTouchLogin,
  mongoLogActivity,
  mongoListUsers,
  mongoListActivity,
} from './mongo';
import { hashPassword } from './auth-crypto';

export type StoreUser = { id: string; name: string; email: string };
type FullUser = StoreUser & { passwordHash: string };

/**
 * Single interface for user records. MongoDB when configured (MONGODB_URI),
 * PostgreSQL otherwise. Callers never need to know which one is active.
 */

export async function findUserByEmail(email: string): Promise<FullUser | null> {
  const key = email.trim().toLowerCase();
  if (await isMongoReady()) {
    const doc = await mongoFindUserByEmail(key);
    if (doc) return { id: String(doc._id), name: doc.name, email: doc.email, passwordHash: doc.passwordHash };
  }
  const [row] = await db.select().from(users).where(eq(users.email, key));
  return row ?? null;
}

export async function userExists(email: string) {
  return (await findUserByEmail(email)) !== null;
}

export async function createUserRecord(name: string, email: string, password: string) {
  const key = email.trim().toLowerCase();
  const id = randomUUID();
  const passwordHash = hashPassword(password);
  if (await isMongoReady()) {
    try {
      await mongoCreateUser({
        _id: id,
        name: name.trim().slice(0, 100),
        email: key,
        passwordHash,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 1,
      });
      return id;
    } catch {
      /* Mongo exists but write failed (duplicate key / transient) → fall through to Postgres */
    }
  }
  try {
    await db.insert(users).values({ id, name: name.trim().slice(0, 100), email: key.slice(0, 254), passwordHash });
  } catch {
    /* Postgres tables missing — self-heal by pushing the schema and retrying once */
    await db.execute(sql`CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamp DEFAULT now() NOT NULL
    )`);
    await db.insert(users).values({ id, name: name.trim().slice(0, 100), email: key.slice(0, 254), passwordHash });
  }
  return id;
}

export async function findUserById(id: string): Promise<StoreUser | null> {
  if (await isMongoReady()) {
    const doc = await mongoFindUserById(id);
    if (doc) return { id: String(doc._id), name: doc.name, email: doc.email };
  }
  const [row] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function recordLogin(userId: string | null, email: string, action: 'signup' | 'login' | 'logout' | 'failed', meta?: { ip?: string; userAgent?: string }) {
  if (await isMongoReady()) {
    await mongoLogActivity({ userId, email, action, ip: meta?.ip || '', userAgent: (meta?.userAgent || '').slice(0, 300), createdAt: new Date() });
    if (userId && (action === 'login' || action === 'signup')) await mongoTouchLogin(userId);
  }
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
};

export type AdminActivityRow = {
  email: string;
  action: string;
  createdAt: string;
};

/** Users + recent login activity for the admin panel. */
export async function listUsersForAdmin(): Promise<{ source: 'mongodb' | 'postgres'; users: AdminUserRow[]; activity: AdminActivityRow[] }> {
  if (await isMongoReady()) {
    const [u, a] = await Promise.all([mongoListUsers(), mongoListActivity(120)]);
    return {
      source: 'mongodb',
      users: u.map((x) => ({
        id: String(x._id),
        name: x.name,
        email: x.email,
        createdAt: (x.createdAt instanceof Date ? x.createdAt : new Date(x.createdAt)).toISOString(),
        lastLoginAt: x.lastLoginAt ? (x.lastLoginAt instanceof Date ? x.lastLoginAt : new Date(x.lastLoginAt)).toISOString() : null,
        loginCount: x.loginCount ?? 0,
      })),
      activity: a.map((x) => ({ email: x.email, action: x.action, createdAt: (x.createdAt instanceof Date ? x.createdAt : new Date(x.createdAt)).toISOString() })),
    };
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      loginCount: sql<number>`(
        select count(*)::int from ${userSessions} s where s.user_id = ${users.id}
      )`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Approximate last-login from the newest session per user.
  const sessions = await db.select({ userId: userSessions.userId, expiresAt: userSessions.expiresAt }).from(userSessions);
  const lastSeen = new Map<string, string>();
  for (const s of sessions) {
    const iso = s.expiresAt.toISOString();
    if (!lastSeen.has(s.userId) || iso > lastSeen.get(s.userId)!) lastSeen.set(s.userId, iso);
  }

  return {
    source: 'postgres',
    users: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      createdAt: r.createdAt.toISOString(),
      lastLoginAt: lastSeen.get(r.id) ?? null,
      loginCount: r.loginCount ?? 0,
    })),
    activity: [],
  };
}
