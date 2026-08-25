import { beforeAll, beforeEach } from "vitest";
import { ensureTestDbReady, resetTestDb } from "./db";

beforeAll(async () => {
  await ensureTestDbReady();
});

beforeEach(async () => {
  await resetTestDb();
});
