import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sections, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSections } from '@/lib/catalog';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { dbReady } from '@/db/schema-ddl';

export async function GET(req: Request) { await dbReady();
  try {
    const admin = new URL(req.url).searchParams.get('admin') === 'true' && (await getAdmin());
    return NextResponse.json(await getSections(!!admin));
  } catch {
    return NextResponse.json({ error: 'Sections are temporarily unavailable.' }, { status: 500 });
  }
}

export async function POST(req: Request) { await dbReady();
  if (!sameOrigin(req) || !(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, name, active, order } = await req.json();
    if (typeof name !== 'string' || !name.trim() || name.length > 60)
      return NextResponse.json({ error: 'Section name is required (max 60 characters).' }, { status: 400 });
    const values = { name: name.trim(), active: active !== false, order: Number.isInteger(order) ? order : 0 };
    if (id) {
      const [result] = await db.update(sections).set(values).where(eq(sections.id, id)).returning();
      if (!result) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
      return NextResponse.json(result);
    }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section';
    const unique = slug + '-' + Math.random().toString(36).slice(2, 6);
    const [result] = await db.insert(sections).values({ id: unique, ...values }).returning();
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not save the section.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) { await dbReady();
  if (!sameOrigin(req) || !(await getAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing section ID' }, { status: 400 });
  try {
    await db.update(products).set({ sectionId: null }).where(eq(products.sectionId, id));
    await db.delete(sections).where(eq(sections.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not delete the section.' }, { status: 500 });
  }
}
