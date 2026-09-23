import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { getMongoStatus } from '@/lib/mongo';

/** Admin-only MongoDB diagnostics. Never returns credentials. */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const status = await getMongoStatus();
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const status = await getMongoStatus();
  return NextResponse.json(status, { status: status.connected ? 200 : 503 });
}
