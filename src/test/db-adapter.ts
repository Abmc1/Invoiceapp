// Test-only stand-in for `@/db`. See vitest.config.ts, which aliases the
// `@/db` import specifier to this file for the test environment, so every
// service module under test transparently runs against the in-memory
// PGlite database instead of requiring a real PostgreSQL connection.
export { testDb as db } from "./db";
