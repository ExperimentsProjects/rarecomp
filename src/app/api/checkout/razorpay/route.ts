import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sameOrigin } from '@/lib/auth';
import { validateCart } from '@/app/api/orders/route';
import { createRazorpayOrder } from '@/lib/razorpay';
import { getRazorpayKeys } from '@/lib/settings';
import { randomBytes, randomUUID } from 'crypto';
import { dbReady } from '@/db/schema-ddl';

export async function POST(req: Request) { await dbReady();
  try {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    const { enabled } = await getRazorpayKeys();
    if (!enabled) return NextResponse.json({ error: 'Razorpay checkout is not enabled by the store owner.' }, { status: 400 });
    const data = await req.json();
    const result = await validateCart(data);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    if (result.total <= 0) return NextResponse.json({ error: 'This order is free — use the standard checkout.' }, { status: 400 });

    const orderId = 'EXP-' + randomUUID().slice(0, 8).toUpperCase();
    const rzp = await createRazorpayOrder(result.total, orderId);
    const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : null);
    const [order] = await db
      .insert(orders)
      .values({
        id: orderId,
        token: randomBytes(24).toString('hex'),
        userId: result.userId,
        name: result.name,
        email: result.email,
        items: result.items,
        total: result.total,
        status: 'pending',
        razorpayOrderId: rzp.id,
        address: clean(data.address, 300),
        city: clean(data.city, 80),
        state: clean(data.state, 80),
        pincode: clean(data.pincode, 12),
      })
      .returning();
    return NextResponse.json({ order: { id: order.id, token: order.token }, razorpay: { orderId: rzp.id, amount: rzp.amount, keyId: rzp.keyId } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not start Razorpay checkout.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) { await dbReady();
  // Allow a client to recover the Razorpay order for retry-after-close within 30 minutes.
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const { token } = await req.json();
  if (typeof token !== 'string') return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  const [order] = await db.select().from(orders).where(eq(orders.token, token));
  if (!order || order.status !== 'pending' || !order.razorpayOrderId)
    return NextResponse.json({ error: 'Order cannot be retried.' }, { status: 400 });
  const { keyId } = await getRazorpayKeys();
  return NextResponse.json({ razorpay: { orderId: order.razorpayOrderId, amount: order.total, keyId } });
}
