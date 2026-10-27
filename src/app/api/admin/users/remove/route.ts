import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, userSessions, orders, reviews, addresses } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';
import { isMongoReady, mongoFindUserById, mongoDeleteUser } from '@/lib/mongo';

/**
 * Permanently remove a customer account.
 * Also removes their sessions, saved addresses and reviews, and detaches
 * (but never deletes) their past orders so revenue records stay intact.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

    const admin = await getAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, email } = await req.json();
    if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

    // Never allow removing the owner account from the panel.
    if (id === admin.id) return NextResponse.json({ error: 'You cannot remove the owner account.' }, { status: 400 });

    // Remove from MongoDB (user store) if it is active there.
    if (await isMongoReady()) {
      const target = email || (await mongoFindUserById(id))?.email;
      if (target) await mongoDeleteUser(target);
    }

    await db.delete(reviews).where(eq(reviews.userId, id));
    await db.delete(addresses).where(eq(addresses.userId, id));
    await db.delete(userSessions).where(eq(userSessions.userId, id));
    // Keep order history for accounting, but detach it from the deleted account.
    await db.update(orders).set({ userId: null }).where(eq(orders.userId, id));
    await db.delete(users).where(and(eq(users.id, id), ne(users.id, admin.id)));

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
