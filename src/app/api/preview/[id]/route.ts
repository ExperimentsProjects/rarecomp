import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { componentDocument } from '@/lib/download';
import { dbReady } from '@/db/schema-ddl';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){ await dbReady();const {id}=await params;const [product]=await db.select().from(products).where(eq(products.id,id));if(!product||!product.active)return new Response('Not found',{status:404});return new Response(componentDocument(product.name,product.preview),{headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"sandbox allow-scripts; default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",'X-Content-Type-Options':'nosniff'}});}
