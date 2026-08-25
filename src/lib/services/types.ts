import type { PostgresJsDatabase, PostgresJsTransaction } from "drizzle-orm/postgres-js";
import type * as schema from "@/db/schema";

export type DbClient = PostgresJsDatabase<typeof schema>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbTx = PostgresJsTransaction<typeof schema, any>;

/** Accepted by service functions that may run either standalone or inside a transaction. */
export type DbOrTx = DbClient | DbTx;
