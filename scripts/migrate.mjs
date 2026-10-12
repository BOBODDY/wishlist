import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;
if (!url) {
  console.error('FATAL: DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set.');
  process.exit(1);
}

const client = postgres(url, { max: 1 });

try {
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
} catch (err) {
  console.error('FATAL: migrations failed.');
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
