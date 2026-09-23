import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { admins, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdmin, hashPassword, verifyPassword, createSession, tokenHash, sameOrigin } from '@/lib/auth';
const attempts=new Map<string,{count:number;until:number}>();
export async function GET(){const admin=await getAdmin();const existing=await db.select({id:admins.id}).from(admins).limit(1);return NextResponse.json({admin,needsSetup:existing.length===0});}
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 try{const {email,password,setup}=await req.json();if(typeof email!=='string'||typeof password!=='string'||!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>128)return NextResponse.json({error:'Enter a valid email and a password of 8–128 characters.'},{status:400});
 const key=email.toLowerCase().trim();const attempt=attempts.get(key);if(attempt&&attempt.until>Date.now()&&attempt.count>=8)return NextResponse.json({error:'Too many attempts. Please try again in 15 minutes.'},{status:429});
  if(setup){const [existing]=await db.select().from(admins).limit(1);if(existing)return NextResponse.json({error:'An administrator already exists. Please sign in.'},{status:409});await db.insert(admins).values({id:'owner',email:key,passwordHash:hashPassword(password)}).onConflictDoNothing();const [owner]=await db.select().from(admins).where(eq(admins.id,'owner'));if(owner.email!==key||!verifyPassword(password,owner.passwordHash))return NextResponse.json({error:'Setup has already been completed.'},{status:409});const token=await createSession(owner.id,req);return NextResponse.json({success:true,token});}
  const [admin]=await db.select().from(admins).where(eq(admins.email,key));if(!admin||!verifyPassword(password,admin.passwordHash)){attempts.set(key,{count:(attempt&&attempt.until>Date.now()?attempt.count:0)+1,until:Date.now()+900000});return NextResponse.json({error:'Email or password is incorrect.'},{status:401});}attempts.delete(key);const token=await createSession(admin.id,req);return NextResponse.json({success:true,token});
  }catch{return NextResponse.json({error:'Unable to sign in. Please try again.'},{status:500});}}
export async function DELETE(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});const jar=await cookies();const token=jar.get('stackd_admin')?.value||req.headers.get('x-admin-session')||undefined;if(token&&/^[a-f0-9]{64}$/i.test(token))await db.delete(sessions).where(eq(sessions.token,tokenHash(token)));jar.delete('stackd_admin');return NextResponse.json({success:true});}
