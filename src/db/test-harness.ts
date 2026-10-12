import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type TestDb = PgliteDatabase<typeof schema>;

export interface TestDbHarness {
  db: TestDb;
  client: PGlite;
  close: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDbHarness> {
  const client = new PGlite();
  const dir = path.resolve(process.cwd(), 'drizzle');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }

  const db = drizzle(client, { schema });
  return { db, client, close: () => client.close() };
}
