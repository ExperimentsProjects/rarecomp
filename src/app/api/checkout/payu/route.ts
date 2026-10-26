import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { sameOrigin } from '@/lib/auth';
import { validateCart } from '@/app/api/orders/route';
import { getSetting } from '@/lib/settings';
import { generatePayUHash, PAYU_URLS } from '@/lib/payu';
import { randomBytes, randomUUID } from 'crypto';
import { dbReady } from '@/db/schema-ddl';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

    const key = await getSetting('payu_merchant_key');
    const salt = await getSetting('payu_merchant_salt');
    const mode = (await getSetting('payu_mode')) === 'live' ? 'live' : 'test';

    if (!key || !salt) return NextResponse.json({ error: 'PayU is not configured. Add Merchant Key and Salt in Admin → Settings.' }, { status: 400 });

    const data = await req.json();
    const result = await validateCart(data);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    if (result.total <= 0) return NextResponse.json({ error: 'Free orders use standard checkout.' }, { status: 400 });

    const orderId = 'EXP-' + randomUUID().slice(0, 8).toUpperCase();
    const txnid = orderId;
    const amount = (result.total / 100).toFixed(2); // Convert paise to rupees
    const origin = new URL(req.url).origin;

    // Save order as pending first
    const orderToken = randomBytes(24).toString('hex');
    const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : null);
    await db.insert(orders).values({
      id: orderId,
      token: orderToken,
      userId: result.userId,
      name: result.name,
      email: result.email,
      items: result.items,
      total: result.total,
      shippingFee: result.shippingFee,
      status: 'pending',
      paymentId: txnid,
      address: clean(data.address, 300),
      city: clean(data.city, 80),
      state: clean(data.state, 80),
      pincode: clean(data.pincode, 12),
    });

    // Generate PayU hash
    const hashParams = {
      key,
      txnid,
      amount,
      productinfo: `Order ${orderId} - Experiments_Projects`,
      firstname: result.name.split(' ')[0],
      email: result.email,
      udf1: orderToken, // Store token in udf1 so callback can find the order
    };
    const hash = generatePayUHash(hashParams, salt);

    // Return PayU form data — the frontend will auto-submit this form
    return NextResponse.json({
      payuUrl: PAYU_URLS[mode],
      params: {
        key,
        txnid,
        amount,
        productinfo: hashParams.productinfo,
        firstname: hashParams.firstname,
        email: result.email,
        phone: data.phone || '',
        surl: `${origin}/api/checkout/payu-callback`,
        furl: `${origin}/api/checkout/payu-callback`,
        hash,
        udf1: orderToken,
        service_provider: 'payu_paisa',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'PayU error.' }, { status: 500 });
  }
}
