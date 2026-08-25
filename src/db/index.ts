import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __motivactionDb: DbClient | undefined;
  var __motivactionSql: ReturnType<typeof postgres> | undefined;
}

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. This application requires a PostgreSQL connection string. " +
        "See README.md for instructions on provisioning a free hosted Postgres database (e.g. Neon or Supabase)."
    );
  }

  // `prepare: false` disables server-side prepared statements. This is
  // required when connecting through a transaction-mode pooler (PgBouncer,
  // Supabase's pooled connection string, Neon's pooled endpoint), which
  // don't support them — a very common production setup for this kind of
  // app. It also happens to be required for the optional local PGlite dev
  // server (see `npm run db:dev-server`), which doesn't support the
  // extended query protocol's statement caching.
  const sql = postgres(connectionString, { max: Number(process.env.DB_POOL_MAX ?? 10), prepare: false });
  return { sql, db: drizzle(sql, { schema }) };
}

// Reuse the connection across hot-reloads in development.
const globalForDb = globalThis;

function getDb(): DbClient {
  if (!globalForDb.__motivactionDb) {
    const { sql, db } = createDb();
    globalForDb.__motivactionSql = sql;
    globalForDb.__motivactionDb = db;
  }
  return globalForDb.__motivactionDb;
}

/**
 * A lazy proxy around the real Drizzle client: `createDb()` (and its
 * DATABASE_URL check) only runs the first time a query is actually made,
 * not when this module is imported. This matters because `next build`
 * statically imports every route/service to collect page data — with an
 * eager connection, a production build would fail without a live
 * DATABASE_URL even though building doesn't need one. Runtime behaviour is
 * unchanged: the very first real query still fails immediately and clearly
 * if DATABASE_URL is missing.
 */
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
