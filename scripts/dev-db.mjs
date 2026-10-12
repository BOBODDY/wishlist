import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const port = Number(process.env.DEV_DB_PORT ?? 55432);
const db = await PGlite.create({ dataDir: process.env.DEV_DB_DIR ?? './.dev-db' });
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });

await server.start();
console.log(`dev-db listening on 127.0.0.1:${port}`);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
}
