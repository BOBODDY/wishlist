import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');
}

const globalForDb = globalThis as unknown as { pg?: Sql };

const defaultPoolMax = process.env.VERCEL ? 1 : 10;
const poolMax = Number(process.env.DB_POOL_MAX ?? defaultPoolMax);

const client =
  globalForDb.pg ??
  postgres(connectionString, {
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : defaultPoolMax,
  });
if (process.env.NODE_ENV !== 'production') globalForDb.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
