import { createHmac, timingSafeEqual } from 'crypto';
import { getRazorpayKeys } from './settings';

export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const { keyId, keySecret } = await getRazorpayKeys();
  if (!keyId || !keySecret) throw new Error('Razorpay is not configured by the store owner yet.');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, payment_capture: 1 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || 'Razorpay could not create the payment order.');
  return { id: data.id as string, amount: data.amount as number, keyId };
}

export function verifyRazorpaySignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && timingSafeEqual(a, b);
}
