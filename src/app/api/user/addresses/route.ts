import { NextResponse } from 'next/server';
import { db } from '@/db';
import { addresses } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUser, sameOrigin } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET() {
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const list = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const b = await req.json();
    const fullName = clean(b.fullName, 100);
    const phone = clean(b.phone, 20);
    const line1 = clean(b.line1, 200);
    const line2 = clean(b.line2, 200);
    const city = clean(b.city, 80);
    const state = clean(b.state, 80);
    const pincode = clean(b.pincode, 12);
    const label = clean(b.label, 30) || 'Home';

    if (!fullName || !phone || !line1 || !city || !state || !pincode)
      return NextResponse.json({ error: 'Please complete every required field.' }, { status: 400 });
    if (!/^\d{6}$/.test(pincode))
      return NextResponse.json({ error: 'Enter a valid 6-digit PIN code.' }, { status: 400 });
    if (!/^[0-9+\-\s()]{6,20}$/.test(phone))
      return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });

    const existing = await db.select().from(addresses).where(eq(addresses.userId, user.id));
    const isFirst = existing.length === 0;
    const makeDefault = b.isDefault === true || isFirst;

    if (makeDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
    }

    const [row] = await db
      .insert(addresses)
      .values({
        id: randomUUID(),
        userId: user.id,
        label,
        fullName,
        phone,
        line1,
        line2: line2 || null,
        city,
        state,
        pincode,
        country: 'India',
        isDefault: makeDefault,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, isDefault } = await req.json();
    if (typeof id !== 'string') return NextResponse.json({ error: 'Missing address ID' }, { status: 400 });

    const [row] = await db.select().from(addresses).where(eq(addresses.id, id));
    if (!row || row.userId !== user.id) return NextResponse.json({ error: 'Address not found' }, { status: 404 });

    if (isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
      await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, id));
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const readiness = await dbReady();
    if (!readiness.ok) return NextResponse.json({ error: readiness.error }, { status: 503 });
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing address ID' }, { status: 400 });
    const [row] = await db.select().from(addresses).where(eq(addresses.id, id));
    if (!row || row.userId !== user.id) return NextResponse.json({ error: 'Address not found' }, { status: 404 });

    await db.delete(addresses).where(eq(addresses.id, id));
    if (row.isDefault) {
      const remaining = await db.select().from(addresses).where(eq(addresses.userId, user.id));
      if (remaining.length) {
        await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, remaining[0].id));
      }
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
