import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUser, sameOrigin } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { token } = await req.json();
    if (typeof token !== 'string' || token.length < 10 || token.length > 64 || !/^[a-f0-9]+$/i.test(token))
      return NextResponse.json({ error: 'Paste the token from your private order link.' }, { status: 400 });
    const [order] = await db.select().from(orders).where(eq(orders.token, token));
    if (!order) return NextResponse.json({ error: 'No order found for that token.' }, { status: 404 });
    if (order.userId && order.userId !== user.id)
      return NextResponse.json({ error: 'This order is already linked to another account.' }, { status: 409 });
    const [updated] = await db.update(orders).set({ userId: user.id }).where(eq(orders.token, token)).returning();
    return NextResponse.json({ success: true, orderId: updated.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
