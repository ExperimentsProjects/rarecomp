import { NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews, orders, products } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getUser, getAdmin, sameOrigin } from '@/lib/auth';
import { randomUUID } from 'crypto';

/** True when this user has a confirmed (paid) order containing the product. */
async function hasPurchased(userId: string, productId: string) {
  const mine = await db.select({ items: orders.items, status: orders.status }).from(orders).where(eq(orders.userId, userId));
  return mine.some((o) => o.status === 'paid' && o.items.some((i) => i.id === productId));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    const recent = url.searchParams.get('recent') === 'true';
    const user = await getUser();

    // Homepage social proof: newest reviews across the whole catalogue.
    if (recent) {
      const list = await db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(12);
      const ids = [...new Set(list.map((r) => r.productId))];
      const named = ids.length ? await db.select({ id: products.id, name: products.name, preview: products.preview, image: products.image }).from(products).where(inArray(products.id, ids)) : [];
      const map = new Map(named.map((p) => [p.id, p]));
      return NextResponse.json({
        reviews: list.map((r) => ({ ...r, product: map.get(r.productId) ?? null })).filter((r) => r.product),
      });
    }

    const list = productId
      ? await db.select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt))
      : await db.select().from(reviews).orderBy(desc(reviews.createdAt));

    let purchased = false;
    let myReview = null as typeof list[number] | null;
    if (user && productId) {
      purchased = await hasPurchased(user.id, productId);
      myReview = list.find((r) => r.userId === user.id) ?? null;
    }

    return NextResponse.json({
      reviews: list,
      canReview: !!user,          // any signed-in customer may share their experience
      purchased,                   // drives the "Verified purchase" badge
      myReview,
      user: user ? { id: user.id, name: user.name } : null,
    });
  } catch {
    return NextResponse.json({ error: 'Reviews are temporarily unavailable.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to share your review.' }, { status: 401 });
  try {
    const { productId, rating, title, comment } = await req.json();
    if (typeof productId !== 'string' || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== 'string' || comment.trim().length < 10 || comment.length > 1500)
      return NextResponse.json({ error: 'Add a star rating and at least 10 characters describing your experience.' }, { status: 400 });

    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
    if (!product) return NextResponse.json({ error: 'That component no longer exists.' }, { status: 404 });

    const verified = await hasPurchased(user.id, productId);
    const values = {
      userName: user.name,
      rating,
      title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 90) : null,
      comment: comment.trim().slice(0, 1500),
      verified,
    };

    // One review per person per product — posting again updates it.
    const [existing] = await db.select().from(reviews).where(and(eq(reviews.productId, productId), eq(reviews.userId, user.id)));
    if (existing) {
      const [updated] = await db.update(reviews).set(values).where(eq(reviews.id, existing.id)).returning();
      return NextResponse.json(updated);
    }
    const [created] = await db.insert(reviews).values({ id: randomUUID(), productId, userId: user.id, ...values }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not submit your review. Please try again.' }, { status: 500 });
  }
}

/** Customers can delete their own review; admins can moderate any review. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing review ID' }, { status: 400 });

  const admin = await getAdmin();
  if (admin) {
    await db.delete(reviews).where(eq(reviews.id, id));
    return NextResponse.json({ success: true });
  }
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [row] = await db.select().from(reviews).where(eq(reviews.id, id));
  if (!row || row.userId !== user.id) return NextResponse.json({ error: 'You can only remove your own review.' }, { status: 403 });
  await db.delete(reviews).where(eq(reviews.id, id));
  return NextResponse.json({ success: true });
}
