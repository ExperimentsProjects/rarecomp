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
      const pathname = `health/blob-check-${Date.now()}.txt`;
      try {
        const blob = await put(pathname, new Blob(['ok'], { type: 'text/plain' }), {
          access: 'public',
          contentType: 'text/plain',
          token,
          addRandomSuffix: false,
        });
        await del(blob.url, { token }).catch(() => {});
        return NextResponse.json({ ok: true, configured: true, mode: 'public', message: 'Vercel Blob is connected and writable for this project.', urlHost: new URL(blob.url).host });
      } catch (publicErr) {
        const msg = publicErr instanceof Error ? publicErr.message : String(publicErr);
        if (!/private store/i.test(msg)) {
          return NextResponse.json({ ok: false, configured: true, message: `Blob token exists but upload failed: ${msg}` }, { status: 503 });
        }
        const blob = await put(pathname, new Blob(['ok'], { type: 'text/plain' }), {
          access: 'private',
          contentType: 'text/plain',
          token,
          addRandomSuffix: false,
        });

        // Test if the delivery proxy works
        const testUrl = `${new URL(req.url).origin}/api/blob?url=${encodeURIComponent(blob.url)}`;
        const testRes = await fetch(testUrl);
        const testText = await testRes.text();

        await del(blob.url, { token }).catch(() => {});

        if (testRes.ok && testText === 'ok') {
          return NextResponse.json({ ok: true, configured: true, mode: 'private', message: 'Vercel Blob store is private; delivery proxy verified successfully.', urlHost: new URL(blob.url).host });
        } else {
          return NextResponse.json({ ok: false, configured: true, mode: 'private', message: `Blob is private, but the delivery proxy failed: ${testRes.status} ${testText}` }, { status: 503 });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, configured: true, message: `Blob token exists but upload failed: ${msg}` }, { status: 503 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
