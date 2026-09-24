import { NextResponse } from 'next/server';
import { db } from '@/db';
import { admins, sessions } from '@/db/schema';
import { getAdmin, sameOrigin, hashPassword, verifyPassword, createSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { dbReady } from '@/db/schema-ddl';
export async function POST(req:Request){ await dbReady();if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const admin=await getAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});try{const {currentPassword,password}=await req.json();if(typeof currentPassword!=='string'||typeof password!=='string'||password.length<8||password.length>128)return NextResponse.json({error:'Use a new password of 8–128 characters.'},{status:400});const [stored]=await db.select().from(admins).where(eq(admins.id,admin.id));if(!verifyPassword(currentPassword,stored.passwordHash))return NextResponse.json({error:'Current password is incorrect.'},{status:400});await db.update(admins).set({passwordHash:hashPassword(password)}).where(eq(admins.id,admin.id));await db.delete(sessions).where(eq(sessions.adminId,admin.id));await createSession(admin.id);return NextResponse.json({success:true});}catch{return NextResponse.json({error:'Could not update your password.'},{status:500});}}
