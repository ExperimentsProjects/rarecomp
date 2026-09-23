import { NextResponse } from 'next/server';
import { db } from '@/db';
import { subscribers } from '@/db/schema';
export async function POST(req:Request){try{const {email}=await req.json();if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>254)return NextResponse.json({error:'Please enter a valid email address.'},{status:400});await db.insert(subscribers).values({email:email.trim().toLowerCase()}).onConflictDoNothing();return NextResponse.json({success:true});}catch{return NextResponse.json({error:'Unable to subscribe. Please try again.'},{status:500});}}
