import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { getPublicSettings, getAdminSettings, updateSettings } from '@/lib/settings';
import { dbReady } from '@/db/schema-ddl';

export async function GET(req: Request) {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

    if (new URL(req.url).searchParams.get('admin') === 'true' && (await getAdmin())) {
      return NextResponse.json(await getAdminSettings());
    }
    return NextResponse.json(await getPublicSettings());
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

    const body = await req.json();
    await updateSettings(body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
