import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { existsSync } from "node:fs";
config({ path: existsSync(".env.local") ? ".env.local" : ".env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder:placeholder@localhost:5432/placeholder",
  },
  verbose: true,
  strict: true,
});
