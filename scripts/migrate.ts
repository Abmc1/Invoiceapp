// Env vars are loaded via the `--env-file` flag in package.json's db:migrate
// script (Node 20.6+ native support) rather than an in-code dotenv import,
// because ESM import hoisting would otherwise run this file's imports
// (including anything that reads process.env at module scope) before an
// in-code dotenv call had a chance to run.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Set it in .env.local before running migrations.");
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
