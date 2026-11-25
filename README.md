# Wishlist

A small gift wishlist site. Anyone can browse gifts and claim (or unclaim) the ones marked claimable; adding gifts is protected by a shared password.

Built with Next.js 16 (App Router, React 19), TypeScript, Drizzle ORM, and PostgreSQL. Production runs on `postgres.js` (e.g. Neon on Vercel); local development and tests use [PGlite](https://pglite.dev).

## Pages

| Route | Description |
|---|---|
| `/` | The wishlist. Gifts are listed unclaimed first, then claimed. Claiming asks for confirmation; unclaiming is immediate. |
| `/new.html` | Add a gift. Requires logging in with `ADD_GIFT_PASSWORD`; sessions last eight hours. |

## Getting started

Requires Node.js 20.9+.

```sh
npm install
cp .env.example .env
```

Set `ADD_GIFT_PASSWORD` in `.env` if you want to add gifts locally. Then, in separate terminals:

```sh
# 1. Start the local PGlite Postgres server (data persists in ./.dev-db)
npm run db:dev

# 2. Apply migrations (the script does not read .env, so pass the URL explicitly)
DATABASE_URL=postgres://wishlist:wishlist@127.0.0.1:55432/wishlist npm run db:migrate

# 3. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

The PGlite server accepts only one connection at a time, so keep `DB_POOL_MAX=1` while using it.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes* | Postgres connection string used by the app. `POSTGRES_URL` is accepted as a fallback. |
| `DATABASE_URL_UNPOOLED` | No | Direct (non-pooled) connection; preferred by migrations and `drizzle-kit` when set. |
| `DB_POOL_MAX` | No | Connection pool size. Defaults to `1` on Vercel, `10` elsewhere. Use `1` with the local PGlite server. |
| `ADD_GIFT_PASSWORD` | No | Password for `/new.html`. When unset, adding gifts is disabled; viewing and claiming stay public. Use a long random value and never expose it as `NEXT_PUBLIC_*`. Changing it invalidates existing sessions. |
| `DEV_DB_PORT` | No | Port for `npm run db:dev` (default `55432`). |
| `DEV_DB_DIR` | No | Data directory for `npm run db:dev` (default `./.dev-db`). |

\* At least one of `DATABASE_URL`, `POSTGRES_URL`, or `DATABASE_URL_UNPOOLED` must be set.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Build the production bundle. |
| `npm run start` | Serve the production build. |
| `npm test` | Run Vitest unit and integration tests against isolated in-memory PGlite databases (no running database needed). |
| `npm run lint` | Run ESLint. |
| `npm run db:dev` | Start the local PGlite socket server on `127.0.0.1:55432`. |
| `npm run db:generate` | Generate SQL migrations in `drizzle/` from `src/db/schema.ts`. |
| `npm run db:migrate` | Apply migrations in `drizzle/` to `DATABASE_URL_UNPOOLED`, `DATABASE_URL`, or `POSTGRES_URL` (first one set). |
| `npm run vercel-build` | Apply migrations, then `next build`. Intended as the Vercel build command (see [Deployment](#deployment)). |

## Project structure

```
src/
  app/
    page.tsx            Wishlist page (dynamic Server Component)
    new.html/page.tsx   Add-gift page, gated by the login dialog
    actions.ts          Server Actions: addGiftAction, claimGiftAction
    add-gift-login.ts   Login Server Action
  components/           Gift card, claim control, add-gift form, login dialog
  db/
    schema.ts           Drizzle schema for the `gifts` table
    index.ts            postgres.js + Drizzle client
    test-harness.ts     In-memory PGlite database for tests
  lib/
    add-gift-auth.ts    Password check and signed session cookies
    gift-input.ts       Gift input validation
    db-access/          Gift queries and mutations
drizzle/                Generated SQL migrations
scripts/                dev-db.mjs (local PGlite server), migrate.mjs
```

## Data model

The `gifts` table:

| Column | Type | Notes |
|---|---|---|
| `id` | text | Primary key |
| `name` | text | Required |
| `description` | text | Optional |
| `estimated_price` | text | Optional; validated as a number, not shown on the wishlist |
| `image_url` | text | Optional; must be `http`/`https` |
| `purchase_url` | text | Optional; must be `http`/`https` |
| `is_claimable` | boolean | Defaults to `false` for new gifts |
| `is_claimed` | boolean | Defaults to `false`; can only change when `is_claimable` is `true` |

To change the schema, edit `src/db/schema.ts`, run `npm run db:generate`, and commit the generated files in `drizzle/`.

## Deployment

The app is set up for Vercel with a Neon Postgres database:

1. Set `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), and `ADD_GIFT_PASSWORD` in the project's environment variables.
2. Set the build command to `npm run vercel-build` (**Settings** > **Build and Deployment** > **Build Command** > **Override**) so migrations run before `next build`. Vercel's Next.js preset runs `npm run build` by default, which skips migrations.

## License

See [LICENSE.txt](LICENSE.txt).
