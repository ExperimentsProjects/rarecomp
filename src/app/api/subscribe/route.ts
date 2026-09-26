import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subscribers } from '@/db/schema';
import { dbReady } from '@/db/schema-ddl';

export async function POST(req: Request) {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });

    const { email } = await req.json();
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254)
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    await db.insert(subscribers).values({ email: email.trim().toLowerCase() }).onConflictDoNothing();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
