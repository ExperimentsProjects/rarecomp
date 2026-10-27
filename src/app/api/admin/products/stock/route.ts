import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, reviews } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';

/**
 * Quick stock management from the admin table:
 *   PATCH  { id, stock, inStock }  → update quantity / availability
 *   DELETE { id }                   → remove a component permanently
 */
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    if (!(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, stock, inStock } = await req.json();
    if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (stock !== undefined) {
      const n = Number(stock);
      if (!Number.isFinite(n) || n < 0 || n > 1000000)
        return NextResponse.json({ error: 'Stock must be a number between 0 and 1,000,000.' }, { status: 400 });
      updates.stock = Math.floor(n);
      // Marking stock at 0 automatically flags the item as out of stock.
      if (n === 0) updates.inStock = false;
    }
    if (inStock !== undefined) updates.inStock = !!inStock;
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const [row] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    return NextResponse.json(row);
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

    await db.delete(reviews).where(eq(reviews.productId, id));
    await db.delete(products).where(eq(products.id, id));
    return NextResponse.json({ success: true, permanent: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
