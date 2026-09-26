import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/**
 * Dual-mode upload:
 * - On Vercel (BLOB_READ_WRITE_TOKEN set): stores files in Vercel Blob and returns the public CDN URL.
 *   Vercel's serverless filesystem is read-only/ephemeral, so Blob is required there.
 * - Locally (sandbox/dev): writes to the uploads/ folder served by /api/media/[name].
 */
export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: 'Choose an image smaller than 5 MB.' }, { status: 400 });
    const ext = EXT[file.type];
    if (!ext) return NextResponse.json({ error: 'Only JPG, PNG, WebP, and GIF images are supported.' }, { status: 400 });

    // Support both standard and Vercel-pasted naming variations
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;

    if (token) {
      const { put } = await import('@vercel/blob');
      const filename = `products/${randomUUID()}.${ext}`;
      const blob = await put(filename, file, { access: 'public', contentType: file.type, token });
      return NextResponse.json({ url: blob.url });
    }

    const filename = randomUUID() + '.' + ext;
    const dir = path.join(process.cwd(), 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: '/api/media/' + filename });
  } catch {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
