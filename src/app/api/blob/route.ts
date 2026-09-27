import { NextResponse, type NextRequest } from 'next/server';
import { get } from '@vercel/blob';

/**
 * Public delivery route for private Blob-store assets.
 *
 * Product photos are public website content, but some Vercel Blob stores are
 * configured as private and cannot return direct CDN URLs. This route fetches a
 * private blob by pathname and streams it back with safe headers so uploaded
 * images still work on the storefront and in the admin panel.
 */
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get('pathname');
  if (!pathname) return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });

  try {
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    });

    if (!result) {
      return new NextResponse('Not found', { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        ETag: result.blob.etag,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
