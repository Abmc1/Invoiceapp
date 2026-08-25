// Test-only stand-in for the "server-only" marker package, which normally
// throws when resolved outside Next.js's server bundling graph. See
// vitest.config.ts, which aliases the "server-only" import specifier to
// this no-op module for the test environment.
export {};
