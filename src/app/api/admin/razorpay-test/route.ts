import { NextResponse } from 'next/server';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { getRazorpayKeys } from '@/lib/settings';

/**
 * Verifies the stored Razorpay credentials by calling the Razorpay API.
 * Returns the account name so you know the keys are live, or a precise error.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { keyId, keySecret } = await getRazorpayKeys();
    if (!keyId || !keySecret) return NextResponse.json({ ok: false, error: 'Add both your Razorpay Key ID and Key Secret first, then test.' });

    const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
      headers: { Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64') },
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) return NextResponse.json({ ok: false, error: 'Invalid credentials. Copy the exact Key ID and Key Secret from Razorpay Dashboard → Settings → API Keys.' });
    if (!res.ok) return NextResponse.json({ ok: false, error: data?.error?.description || `Razorpay responded with ${res.status}.` });

    const mode = keyId.startsWith('rzp_live_') ? 'LIVE' : 'TEST';
    return NextResponse.json({
      ok: true,
      mode,
      message: `Credentials verified — ${mode} mode. Checkout is ready to accept real ${mode === 'LIVE' ? 'payments' : 'test payments'}.`,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not reach Razorpay. Check your connection and try again.' });
  }
}
