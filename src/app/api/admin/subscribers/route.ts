import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subscribers } from '@/db/schema';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';
import { dbReady } from '@/db/schema-ddl';

export async function GET() {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await db.select().from(subscribers).orderBy(desc(subscribers.createdAt)));
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

    const email = new URL(req.url).searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    await db.delete(subscribers).where(eq(subscribers.email, email));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
