import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, products } from '@/db/schema';
import { inArray, eq, desc } from 'drizzle-orm';
import { getAdmin, getUser, sameOrigin } from '@/lib/auth';
import { randomBytes, randomUUID } from 'crypto';

const SHIPPING = ['processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

function cleanAddress(data: Record<string, unknown>) {
  const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : null);
  return {
    address: clean(data.address, 300) || null,
    city: clean(data.city, 80) || null,
    state: clean(data.state, 80) || null,
    pincode: clean(data.pincode, 12) || null,
  };
}

export async function validateCart(data: Record<string, unknown>) {
  const { name, email, productIds } = data as { name: unknown; email: unknown; productIds: unknown };
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) ||
    !Array.isArray(productIds) || !productIds.length || productIds.length > 50 ||
    productIds.some((x) => typeof x !== 'string')
  ) return { error: 'Please enter your name, a valid email, and at least one component.' } as const;
  const ids = [...new Set<string>(productIds as string[])];
  const found = await db.select().from(products).where(inArray(products.id, ids));
  if (found.length !== ids.length || found.some((p) => !p.active))
    return { error: 'A component is no longer available. Please refresh your cart.' } as const;
  const total = found.reduce((sum, p) => sum + p.price, 0);
  const user = await getUser();
  const { isDigital } = await import('@/lib/money');
  return {
    found,
    total,
    userId: user?.id ?? null,
    name: (name as string).trim().slice(0, 150),
    email: (email as string).trim().toLowerCase().slice(0, 254),
    items: found.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category, digital: isDigital(p.category) })),
  } as const;
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    const data = await req.json();
    const result = await validateCart(data);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    const [order] = await db
      .insert(orders)
      .values({
        id: 'EXP-' + randomUUID().slice(0, 8).toUpperCase(),
        token: randomBytes(24).toString('hex'),
        userId: result.userId,
        name: result.name,
        email: result.email,
        items: result.items,
        total: result.total,
        status: result.total === 0 ? 'paid' : 'pending',
        ...cleanAddress(data),
      })
      .returning();
    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to place your order. Please try again.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (token) {
    const [order] = await db.select().from(orders).where(eq(orders.token, token));
    return order ? NextResponse.json(order) : NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (await getAdmin()) return NextResponse.json(await db.select().from(orders).orderBy(desc(orders.createdAt)));
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function PATCH(req: Request) {
  if (!sameOrigin(req) || !(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, status, shipping, courier, trackingUrl, address, city, state, pincode } = await req.json();
    const updates: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!['pending', 'paid', 'cancelled'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      updates.status = status;
    }
    if (shipping !== undefined) {
      if (!SHIPPING.includes(shipping)) return NextResponse.json({ error: 'Invalid shipping status' }, { status: 400 });
      updates.shipping = shipping;
      updates.shippingUpdatedAt = new Date();
    }
    if (courier !== undefined) updates.courier = typeof courier === 'string' ? courier.trim().slice(0, 120) || null : null;
    if (trackingUrl !== undefined)
      updates.trackingUrl = typeof trackingUrl === 'string' && /^https?:\/\//.test(trackingUrl) ? trackingUrl.slice(0, 300) : null;
    if (address !== undefined) updates.address = cleanAddress({ address }).address;
    if (city !== undefined) updates.city = cleanAddress({ city }).city;
    if (state !== undefined) updates.state = cleanAddress({ state }).state;
    if (pincode !== undefined) updates.pincode = cleanAddress({ pincode }).pincode;
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    const [order] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return order ? NextResponse.json(order) : NextResponse.json({ error: 'Order not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Could not update the order.' }, { status: 500 });
  }
}
