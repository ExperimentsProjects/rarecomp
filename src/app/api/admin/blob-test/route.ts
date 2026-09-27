import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';

/**
 * Admin-only Vercel Blob connectivity diagnostic.
 * Never returns the token — only whether it exists and if a tiny write works.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ ok: false, configured: false, message: 'BLOB_READ_WRITE_TOKEN is missing in Vercel environment variables.' }, { status: 503 });
    }

    try {
      const { put, del } = await import('@vercel/blob');
      const blob = await put(`health/blob-check-${Date.now()}.txt`, new Blob(['ok'], { type: 'text/plain' }), {
        access: 'public',
        contentType: 'text/plain',
        token,
        addRandomSuffix: false,
      });
      await del(blob.url, { token }).catch(() => {});
      return NextResponse.json({ ok: true, configured: true, message: 'Vercel Blob is connected and writable for this project.', urlHost: new URL(blob.url).host });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, configured: true, message: `Blob token exists but upload failed: ${msg}` }, { status: 503 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
