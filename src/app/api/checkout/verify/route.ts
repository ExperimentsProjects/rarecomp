import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sameOrigin } from '@/lib/auth';
import { getRazorpayKeys } from '@/lib/settings';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { dbReady } from '@/db/schema-ddl';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

    const { token, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (
      typeof token !== 'string' || typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' || typeof razorpay_signature !== 'string'
    ) return NextResponse.json({ error: 'Missing payment details.' }, { status: 400 });

    const [order] = await db.select().from(orders).where(eq(orders.token, token));
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.razorpayOrderId !== razorpay_order_id)
      return NextResponse.json({ error: 'Payment order mismatch.' }, { status: 400 });

    const { keySecret } = await getRazorpayKeys();
    if (!keySecret || !verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret))
      return NextResponse.json({ error: 'Payment verification failed. Contact support with your order ID.' }, { status: 400 });

    const [updated] = await db
      .update(orders)
      .set({ status: 'paid', paymentId: razorpay_payment_id })
      .where(eq(orders.id, order.id))
      .returning();
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
