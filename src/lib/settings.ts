import { db } from '@/db';
import { dbReady } from '@/db/schema-ddl';
import { settings } from '@/db/schema';

const DEFAULTS: Record<string, string> = {
  razorpay_enabled: '0',
  razorpay_key_id: '',
  razorpay_key_secret: '',
  contact_email: 'electricalandelectronics64@gmail.com',
  contact_phone: '+91 8639396238',
  instagram_url: '',
  youtube_url: '',
  x_url: '',
};

/** Store identity shown across the storefront and policy pages. */
export const STORE_IDENTITY = {
  name: 'Experiments_Projects',
  email: 'electricalandelectronics64@gmail.com',
  phone: '+91 8639396238',
  phoneDisplay: '+91 86393 96238',
  supportHours: 'Monday – Saturday · 10:00 AM – 7:00 PM IST',
  payments: 'Razorpay · UPI, Credit/Debit Cards, Net-Banking, Wallets',
} as const;

export type StoreSettings = {
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  contactEmail: string;
  contactPhone: string;
  instagramUrl: string;
  youtubeUrl: string;
  xUrl: string;
};

let cache: Record<string, string> | null = null;

async function loadAll() {
  if (cache) return cache;
  const rows = await dbReady()
    .then(() => db.select().from(settings))
    .catch(() => [] as { key: string; value: string }[]);
  cache = { ...DEFAULTS };
  for (const row of rows) cache[row.key] = row.value;
  return cache;
}

export async function getSetting(key: string) {
  const all = await loadAll();
  return all[key] ?? DEFAULTS[key] ?? '';
}

export async function getRazorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID || (await getSetting('razorpay_key_id'));
  const keySecret = process.env.RAZORPAY_KEY_SECRET || (await getSetting('razorpay_key_secret'));
  const enabledFlag = process.env.RAZORPAY_KEY_ID ? '1' : await getSetting('razorpay_enabled');
  return { keyId, keySecret, enabled: enabledFlag === '1' && !!keyId && !!keySecret };
}

export async function getPublicSettings(): Promise<StoreSettings> {
  const { keyId, enabled } = await getRazorpayKeys();
  const all = await loadAll();
  return {
    razorpayEnabled: enabled,
    razorpayKeyId: enabled ? keyId : '',
    contactEmail: all.contact_email,
    contactPhone: all.contact_phone,
    instagramUrl: all.instagram_url,
    youtubeUrl: all.youtube_url,
    xUrl: all.x_url,
  };
}

const ALLOWED_KEYS = Object.keys(DEFAULTS);

export async function updateSettings(adminUpdates: Record<string, unknown>) {
  for (const key of ALLOWED_KEYS) {
    const raw = adminUpdates[key];
    if (raw === undefined) continue;
    if (typeof raw !== 'string' || raw.length > 500) continue;
    // Never allow secrets to be overwritten blindly with whitespace.
    const value = raw.trim();
    if (key === 'razorpay_enabled' && !['0', '1'].includes(value)) continue;
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  cache = null;
}

export async function getAdminSettings() {
  const all = await loadAll();
  return {
    razorpay_enabled: all.razorpay_enabled,
    razorpay_key_id: all.razorpay_key_id,
    razorpay_key_secret: all.razorpay_key_secret,
    contact_email: all.contact_email,
    contact_phone: all.contact_phone,
    instagram_url: all.instagram_url,
    youtube_url: all.youtube_url,
    x_url: all.x_url,
  };
}
