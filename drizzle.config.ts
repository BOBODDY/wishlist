import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      'postgres://wishlist:wishlist@127.0.0.1:55432/wishlist',
  },
} satisfies Config;
