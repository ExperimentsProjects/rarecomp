import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const sections = pgTable('sections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  sectionId: text('section_id'),
  price: integer('price').notNull(),
  oldPrice: integer('old_price'),
  image: text('image'),
  preview: text('preview').notNull().default('dashboard'),
  specs: jsonb('specs').$type<{ name: string; value: string }[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  badge: text('badge'),
  featured: boolean('featured').notNull().default(false),
  active: boolean('active').notNull().default(true),
  source: text('source'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const admins = pgTable('admins', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('Owner'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  adminId: text('admin_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSessions = pgTable('user_sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('user_id'),
  name: text('name').notNull(),
  email: text('email').notNull(),
  items: jsonb('items').$type<{ id: string; name: string; price: number; category?: string; digital?: boolean }[]>().notNull(),
  total: integer('total').notNull(),
  status: text('status').notNull().default('pending'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  pincode: text('pincode'),
  shipping: text('shipping').notNull().default('processing'),
  courier: text('courier'),
  trackingUrl: text('tracking_url'),
  shippingUpdatedAt: timestamp('shipping_updated_at'),
  paymentId: text('payment_id'),
  razorpayOrderId: text('razorpay_order_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  rating: integer('rating').notNull(),
  title: text('title'),
  comment: text('comment').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
});

export const subscribers = pgTable('subscribers', {
  email: text('email').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Review = typeof reviews.$inferSelect;
