import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSetting } from '@/lib/settings';
import { verifyPayUReverseHash } from '@/lib/payu';
import { dbReady } from '@/db/schema-ddl';

/**
 * PayU redirects the customer here after payment (both success and failure).
 * We verify the reverse hash server-side, then redirect the user to their order page.
 */
export async function POST(req: Request) {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) throw new Error('DB offline');

    const form = await req.formData();
    const status = (form.get('status') as string) || '';
    const txnid = (form.get('txnid') as string) || '';
    const amount = (form.get('amount') as string) || '';
    const productinfo = (form.get('productinfo') as string) || '';
    const firstname = (form.get('firstname') as string) || '';
    const email = (form.get('email') as string) || '';
    const receivedHash = (form.get('hash') as string) || '';
    const mihpayid = (form.get('mihpayid') as string) || '';
    const udf1 = (form.get('udf1') as string) || ''; // Contains the order token

    const key = await getSetting('payu_merchant_key');
    const salt = await getSetting('payu_merchant_salt');
    const origin = new URL(req.url).origin;

    // Verify the reverse hash from PayU
    const isValid = verifyPayUReverseHash(
      { key, txnid, amount, productinfo, firstname, email, status, udf1 },
      salt,
      receivedHash,
    );

    if (!isValid) {
      console.error('[PayU] Hash verification failed for txnid:', txnid);
      return NextResponse.redirect(`${origin}/account?error=hash_verification_failed`, 303);
    }

    if (status === 'success') {
      // Find the order by its ID (txnid = orderId)
      const [order] = await db.update(orders)
        .set({ status: 'paid', paymentId: mihpayid || txnid })
        .where(eq(orders.id, txnid))
        .returning();

      if (order) {
        return NextResponse.redirect(`${origin}/orders/${order.token}`, 303);
      }
      return NextResponse.redirect(`${origin}/account?success=payment_confirmed`, 303);
    } else {
      // Payment failed or cancelled
      console.error('[PayU] Payment failed:', status, 'txnid:', txnid);
      return NextResponse.redirect(`${origin}/account?error=payment_${status}`, 303);
    }
  } catch (e) {
    console.error('[PayU] Callback error:', e);
    const origin = new URL(req.url).origin;
    return NextResponse.redirect(`${origin}/account?error=internal_error`, 303);
  }
}
