import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUser } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';

export async function GET() {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const list = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
