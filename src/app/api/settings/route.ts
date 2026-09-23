import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { getPublicSettings, getAdminSettings, updateSettings } from '@/lib/settings';

export async function GET(req: Request) {
  try {
    if (new URL(req.url).searchParams.get('admin') === 'true' && (await getAdmin())) {
      return NextResponse.json(await getAdminSettings());
    }
    return NextResponse.json(await getPublicSettings());
  } catch {
    return NextResponse.json({ error: 'Settings are temporarily unavailable.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    await updateSettings(body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }
}
