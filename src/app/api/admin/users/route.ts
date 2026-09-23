import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { listUsersForAdmin } from '@/lib/user-store';
import { getMongoStatus } from '@/lib/mongo';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

/** Registered users + login activity for the admin panel. */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { source, users, activity } = await listUsersForAdmin();
    // Enrich with order counts + spend so the panel is genuinely useful.
    const enriched = await Promise.all(
      users.map(async (u) => {
        const rows = await db.select({ total: orders.total, status: orders.status }).from(orders).where(eq(orders.userId, u.id));
        const paid = rows.filter((r) => r.status === 'paid');
        return {
          ...u,
          orderCount: rows.length,
          paidOrders: paid.length,
          totalSpentPaise: paid.reduce((s, r) => s + r.total, 0),
        };
      }),
    );
    const mongo = await getMongoStatus();
    return NextResponse.json({ source, mongoConnected: mongo.connected, mongo, users: enriched, activity });
  } catch {
    return NextResponse.json({ error: 'Could not load users.' }, { status: 500 });
  }
}

/** Remove a user's sessions (sign them out everywhere). */
export async function DELETE(req: Request) {
  if (!sameOrigin(req) || !(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  const { db: database } = await import('@/db');
  const { userSessions } = await import('@/db/schema');
  await database.delete(userSessions).where(eq(userSessions.userId, id));
  return NextResponse.json({ success: true });
}
