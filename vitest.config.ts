import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Makes the "server-only" marker package resolve to its no-op export,
    // matching how Next.js resolves it when bundling the server graph.
    conditions: ["react-server"],
    alias: [
      // Exact match only — must not shadow "@/db/schema" or other subpaths.
      { find: /^@\/db$/, replacement: path.resolve(__dirname, "src/test/db-adapter.ts") },
      { find: /^server-only$/, replacement: path.resolve(__dirname, "src/test/server-only-shim.ts") },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
