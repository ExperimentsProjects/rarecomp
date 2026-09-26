import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, sections, reviews } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getProducts, ensureCatalog } from '@/lib/catalog';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { dbReady } from '@/db/schema-ddl';

const CATEGORIES = [
  'Devices',
  'Source Code',
  'Source Code & Firmware',
  'Development Boards',
  'Wireless & RF',
  'Antennas & Accessories',
  'Modules & Sensors',
  'Kits & Bundles',
  'Templates',
  'Freebies',
];

const PREVIEWS = [
  'hardware-device',
  'hardware-code',
  'hardware-board',
  'hardware-module',
  'hardware-antenna',
  'hardware-kit',
  'dashboard',
  'orbit',
  'pricing',
  'landing',
  'buttons',
  'login',
  'portfolio',
  'aurora',
];

async function withRatings(list: (typeof products.$inferSelect)[]) {
  const rows = await db
    .select({ productId: reviews.productId, count: sql<number>`count(*)::int`, avg: sql<number>`round(avg(${reviews.rating})::numeric,1)::float` })
    .from(reviews)
    .groupBy(reviews.productId)
    .catch(() => [] as { productId: string; count: number; avg: number }[]);
  const map = new Map(rows.map((r) => [r.productId, r]));
  return list.map((p) => ({ ...p, ratingAvg: map.get(p.id)?.avg ?? 0, ratingCount: map.get(p.id)?.count ?? 0 }));
}

export async function GET(req: Request) {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

    await ensureCatalog();
    if (new URL(req.url).searchParams.get('admin') === 'true' && (await getAdmin())) {
      return NextResponse.json(await withRatings(await db.select().from(products)));
    }
    const data = await withRatings(await getProducts());
    return NextResponse.json(data.map(({ source, ...p }) => ({ ...p, hasSource: !!source })));
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

    const data = await req.json();
    if (
      typeof data.name !== 'string' || !data.name.trim() ||
      typeof data.description !== 'string' || !data.description.trim() ||
      !Number.isInteger(data.price) || data.price < 0 || data.price > 100000000 ||
      !CATEGORIES.includes(data.category)
    ) return NextResponse.json({ error: 'Please provide a name, description, category, and valid price.' }, { status: 400 });

    if (data.image && !(data.image.startsWith('/api/media/') || data.image.startsWith('/products/') || /^https?:\/\//.test(data.image)))
      return NextResponse.json({ error: 'Use an image upload or a valid http(s) image URL.' }, { status: 400 });

    let sectionId: string | null = null;
    if (typeof data.sectionId === 'string' && data.sectionId) {
      const [section] = await db.select().from(sections).where(eq(sections.id, data.sectionId));
      if (!section) return NextResponse.json({ error: 'Unknown section.' }, { status: 400 });
      sectionId = section.id;
    }

    let specs: { name: string; value: string }[] = [];
    if (Array.isArray(data.specs)) {
      specs = data.specs
        .filter((s: unknown) => s && typeof (s as { name?: unknown }).name === 'string' && typeof (s as { value?: unknown }).value === 'string')
        .slice(0, 20)
        .map((s: { name: string; value: string }) => ({ name: s.name.trim().slice(0, 60), value: s.value.trim().slice(0, 160) }))
        .filter((s: { name: string; value: string }) => s.name && s.value);
    }

    const values = {
      name: data.name.trim().slice(0, 150),
      description: data.description.slice(0, 5000),
      category: data.category,
      sectionId,
      price: data.price,
      oldPrice: Number.isInteger(data.oldPrice) && data.oldPrice > data.price ? data.oldPrice : null,
      image: data.image || null,
      preview: PREVIEWS.includes(data.preview) ? data.preview : 'dashboard',
      specs,
      tags: Array.isArray(data.tags) ? data.tags.filter((t: unknown) => typeof t === 'string').slice(0, 5) : [],
      badge: data.badge || null,
      featured: !!data.featured,
      active: data.active !== false,
      source: typeof data.source === 'string' ? data.source.slice(0, 500000) : null,
    };

    if (data.id) {
      const [result] = await db.update(products).set(values).where(eq(products.id, data.id)).returning();
      if (!result) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json(result);
    }
    const [result] = await db.insert(products).values({ id: randomUUID(), ...values }).returning();
    return NextResponse.json(result, { status: 201 });
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

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });
    await db.update(products).set({ active: false }).where(eq(products.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
