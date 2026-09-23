import mongoose, { Schema, type Model } from 'mongoose';

/**
 * MongoDB layer for customer accounts and login activity.
 *
 * Supported configuration:
 * 1. MONGODB_URI=mongodb+srv://... (takes priority), or
 * 2. MONGODB_USERNAME + MONGODB_PASSWORD + MONGODB_HOST + MONGODB_DATABASE.
 *
 * Credentials remain server-side and are URL-encoded before use.
 */

export type UserDoc = {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  loginCount: number;
};

export type ActivityDoc = {
  userId: string | null;
  email: string;
  action: 'signup' | 'login' | 'logout' | 'failed';
  ip?: string;
  userAgent?: string;
  createdAt: Date;
};

export type MongoConfigStatus = {
  configured: boolean;
  connected: boolean;
  source: 'uri' | 'split' | 'none';
  host: string;
  database: string;
  message: string;
};

const userSchema = new Schema<UserDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
  },
  { collection: 'users' },
);

const activitySchema = new Schema<ActivityDoc>(
  {
    userId: { type: String, default: null, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    action: { type: String, required: true, enum: ['signup', 'login', 'logout', 'failed'], index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'login_activity' },
);

const globalForMongo = globalThis as typeof globalThis & {
  __epMongo?: typeof mongoose;
  __epMongoPromise?: Promise<typeof mongoose | null>;
};

function cleanHost(value: string) {
  return value
    .trim()
    .replace(/^mongodb(\+srv)?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\?.*$/, '');
}

function config() {
  const direct = (process.env.MONGODB_URI || '').trim();
  if (/^mongodb(\+srv)?:\/\//.test(direct)) {
    try {
      const withoutScheme = direct.replace(/^mongodb(\+srv)?:\/\//, '');
      const hostPart = withoutScheme.includes('@') ? withoutScheme.split('@').pop()! : withoutScheme;
      const host = cleanHost(hostPart);
      const path = hostPart.slice(hostPart.indexOf('/') + 1).split('?')[0];
      return { uri: direct, source: 'uri' as const, host, database: path || 'experiments_projects', missing: '' };
    } catch {
      return { uri: '', source: 'uri' as const, host: '', database: '', missing: 'MONGODB_URI is malformed.' };
    }
  }

  const username = (process.env.MONGODB_USERNAME || '').trim();
  const password = process.env.MONGODB_PASSWORD || '';
  const host = cleanHost(process.env.MONGODB_HOST || '');
  const database = (process.env.MONGODB_DATABASE || 'experiments_projects').trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'experiments_projects';

  if (!username) return { uri: '', source: 'none' as const, host, database, missing: 'MONGODB_USERNAME is missing.' };
  if (!password) return { uri: '', source: 'none' as const, host, database, missing: 'MONGODB_PASSWORD is missing.' };
  if (!host) return { uri: '', source: 'split' as const, host, database, missing: 'MONGODB_HOST is missing. Copy the cluster hostname from Atlas → Connect → Drivers.' };
  if (!/^[a-zA-Z0-9.-]+(?::\d+)?$/.test(host)) return { uri: '', source: 'split' as const, host, database, missing: 'MONGODB_HOST is not a valid Atlas hostname.' };

  const scheme = host.includes(':') && !host.endsWith('.mongodb.net') ? 'mongodb' : 'mongodb+srv';
  const uri = `${scheme}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/${database}?retryWrites=true&w=majority`;
  return { uri, source: 'split' as const, host, database, missing: '' };
}

export async function connectMongo() {
  if (globalForMongo.__epMongo && mongoose.connection.readyState === 1) return globalForMongo.__epMongo;
  const current = config();
  if (!current.uri) return null;
  if (globalForMongo.__epMongoPromise) return globalForMongo.__epMongoPromise;

  globalForMongo.__epMongoPromise = (async () => {
    try {
      mongoose.set('strictQuery', true);
      const conn = await mongoose.connect(current.uri, {
        serverSelectionTimeoutMS: 7000,
        connectTimeoutMS: 7000,
        maxPoolSize: 10,
        dbName: current.database,
      });
      globalForMongo.__epMongo = conn;
      return conn;
    } catch (error) {
      console.error('MongoDB connection failed:', error instanceof Error ? error.message : 'Unknown connection error');
      return null;
    } finally {
      globalForMongo.__epMongoPromise = undefined;
    }
  })();

  return globalForMongo.__epMongoPromise;
}

export async function isMongoReady() {
  return (await connectMongo()) !== null;
}

export async function getMongoStatus(): Promise<MongoConfigStatus> {
  const current = config();
  if (!current.uri) {
    return {
      configured: false,
      connected: false,
      source: current.source,
      host: current.host,
      database: current.database,
      message: current.missing,
    };
  }
  const connected = (await connectMongo()) !== null;
  return {
    configured: true,
    connected,
    source: current.source,
    host: current.host,
    database: current.database,
    message: connected
      ? `Connected to ${current.database} on ${current.host}.`
      : 'Credentials are configured, but Atlas rejected or could not reach the connection. Check Network Access and the cluster hostname.',
  };
}

function userModel(): Model<UserDoc> {
  return (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>('User', userSchema);
}
function activityModel(): Model<ActivityDoc> {
  return (mongoose.models.LoginActivity as Model<ActivityDoc>) || mongoose.model<ActivityDoc>('LoginActivity', activitySchema);
}

export async function mongoFindUserByEmail(email: string) {
  if (!(await isMongoReady())) return null;
  return userModel().findOne({ email: email.trim().toLowerCase() }).lean();
}

export async function mongoFindUserById(id: string) {
  if (!(await isMongoReady())) return null;
  return userModel().findById(id).lean();
}

export async function mongoCreateUser(doc: UserDoc) {
  if (!(await isMongoReady())) return null;
  await userModel().create(doc);
  return doc;
}

export async function mongoTouchLogin(userId: string) {
  if (!(await isMongoReady())) return;
  await userModel().updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } });
}

export async function mongoLogActivity(entry: Omit<ActivityDoc, 'createdAt'> & { createdAt?: Date }) {
  if (!(await isMongoReady())) return;
  await activityModel().create(entry);
}

export async function mongoListUsers() {
  if (!(await isMongoReady())) return [];
  return userModel().find({}).sort({ createdAt: -1 }).limit(500).lean();
}

export async function mongoListActivity(limit = 100) {
  if (!(await isMongoReady())) return [];
  return activityModel().find({}).sort({ createdAt: -1 }).limit(limit).lean();
}
