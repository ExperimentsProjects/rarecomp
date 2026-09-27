import { NextResponse, type NextRequest } from 'next/server';

/**
 * Public delivery route for private Blob-store assets.
 *
 * Product photos are public website content, but some Vercel Blob stores are
 * configured as private and cannot return direct CDN URLs. This route fetches a
 * private blob by URL (using the server-side token) and streams it back.
 *
 * This works around the "Cannot use public access on a private store" error
 * while still keeping the store private for other uses.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get('url');

  if (!blobUrl) {
    return NextResponse.json({ error: 'Missing blob URL' }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(blobUrl);
    if (
      parsedUrl.protocol !== 'https:' ||
      !parsedUrl.hostname.endsWith('.blob.vercel-storage.com')
    ) {
      return NextResponse.json({ error: 'Invalid blob URL' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;
    if (!token) {
      console.error('[BLOB] Token missing for private delivery');
      return NextResponse.json({ error: 'Storage token missing' }, { status: 500 });
    }

    // Fetch the private blob content directly using the read-write token.
    const response = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[BLOB] Upstream fetch failed:', response.status, response.statusText);
      return new NextResponse('Not found', { status: 404 });
    }

    // Stream the response body back to the client.
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'ETag': response.headers.get('ETag') || '',
      },
    });
  } catch (e) {
    console.error('[BLOB] Proxy error:', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
