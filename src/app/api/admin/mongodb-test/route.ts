import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { getMongoStatus } from '@/lib/mongo';
import { dbReady } from '@/db/schema-ddl';

/** Admin-only MongoDB diagnostics. Never returns credentials. */
export async function GET() {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const status = await getMongoStatus();
    return NextResponse.json(status);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const status = await getMongoStatus();
    return NextResponse.json(status, { status: status.connected ? 200 : 503 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
