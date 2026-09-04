/**
 * Test setup: connects to PostgreSQL, creates the PGBloom client,
 * and exports shared test infrastructure.
 *
 * Throws immediately if DATABASE_URL is missing.
 */

import { createPgbloom } from "../dist/esm/index.js";
import { createLocalStore } from "../dist/esm/index.js";
import { RUN_ID, cleanupDatabase, makeTempDir, rmTempDir } from "./helpers/test-data.js";

if (!process.env.DATABASE_URL) {
  console.error("");
  console.error("ERROR: DATABASE_URL environment variable is required.");
  console.error("Example: set DATABASE_URL=postgresql://postgres:StrongPass123@skobase.skoegle.cloud:5433/iotkit?statusColor=&env=local&name=New%20Connection&tLSMode=0&usePrivateKey=false&safeModeLevel=0&advancedSafeModeLevel=0&driverVersion=0&showSystemSchemas=0&driverVersion=0&lazyload=False");
  console.error("");
  process.exit(1);
}

export const connectionString = process.env.DATABASE_URL;

export let client;
export let localCacheDir;
export let localStore;

export async function setup(options = {}) {
  const opts = {
    cleanupInterval: false, // disable auto-cleanup for predictable tests
    bloomFilter: true,
    bloom: { expectedItems: 5000, falsePositiveRate: 0.01, rebuildInterval: false },
    lock: { defaultTtl: 10000 },
    scheduler: { workerId: `worker-${RUN_ID}` },
    queue: { visibilityTimeout: 1000, maxAttempts: 3 },
    events: { maxListenersPerType: 100 },
    counter: { defaultConsistency: "strong" },
    maxConnections: 10,
    ...options,
  };

  client = await createPgbloom(connectionString, opts);

  // Create separate local store for cache/rate-limit/counter tests
  localCacheDir = await makeTempDir("-local");
  localStore = await createLocalStore({ path: localCacheDir, ttl: 60000, maxEntries: 10000 });

  return { client, localStore };
}

export async function teardown() {
  try {
    if (client) {
      await cleanupDatabase(client);
      await client.close();
      client = null;
    }
    if (localStore) {
      await localStore.close();
      localStore = null;
    }
    if (localCacheDir) {
      await rmTempDir(localCacheDir);
      localCacheDir = null;
    }
  } catch (err) {
    console.warn(`Teardown warning: ${err.message}`);
  }
}

export { RUN_ID, cleanupDatabase, makeTempDir };
