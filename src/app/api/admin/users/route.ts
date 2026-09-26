import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { listUsersForAdmin } from '@/lib/user-store';
import { getMongoStatus } from '@/lib/mongo';
import { db } from '@/db';
import { orders, userSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { dbReady } from '@/db/schema-ddl';

export async function GET() {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { source, users, activity } = await listUsersForAdmin();
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
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    await db.delete(userSessions).where(eq(userSessions.userId, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
