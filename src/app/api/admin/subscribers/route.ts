import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subscribers } from '@/db/schema';
import { getAdmin, sameOrigin } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';
export async function GET(){if(!await getAdmin())return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json(await db.select().from(subscribers).orderBy(desc(subscribers.createdAt)));}
export async function DELETE(req:Request){if(!sameOrigin(req)||!await getAdmin())return NextResponse.json({error:'Unauthorized'},{status:401});const email=new URL(req.url).searchParams.get('email');if(!email)return NextResponse.json({error:'Email required'},{status:400});await db.delete(subscribers).where(eq(subscribers.email,email));return NextResponse.json({success:true});}
