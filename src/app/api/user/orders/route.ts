import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUser } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';

export async function GET() { await dbReady();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const list = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: 'Could not load your orders.' }, { status: 500 });
  }
}
