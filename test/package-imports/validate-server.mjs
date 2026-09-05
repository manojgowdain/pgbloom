/**
 * Server entry point validation for PGBloom.
 *
 * Verifies that the server bundle exports the full PGBloom API.
 *
 * Run from project root after `npm run build`:
 *
 *   node test/package-imports/validate-server.mjs
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");

console.log("=== PGBloom server entry validation ===\n");

const serverPath = pathToFileURL(resolve(projectRoot, "dist", "esm", "server.js"));
const mod = await import(serverPath);

const requiredExports = [
  "BloomFilter",
  "createPgbloom",
  "createLockState",
  "tryLock",
  "lock",
  "unlock",
  "acquireLeadership",
  "releaseLeadership",
  "isLeader",
  "createSchedulerState",
  "schedule",
  "scheduleRecurring",
  "cancelSchedule",
  "createRateLimitState",
  "rateLimit",
  "rateLimitTokenBucket",
  "createEventsState",
  "emit",
  "listen",
  "createCounterState",
  "increment",
  "decrement",
  "SSDiskStore",
  "MemoryCache",
  "createLocalStore",
];

let passed = 0;
let failed = 0;

for (const name of requiredExports) {
  if (typeof mod[name] === "function") {
    console.log(`✓ Server exports function: ${name}`);
    passed++;
  } else {
    console.log(`✗ Server missing or non-function: ${name}`);
    failed++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`PASS: ${passed} / FAIL: ${failed}`);

if (failed > 0) {
  process.exit(1);
}

console.log("\n✓ Server entry validation passed.");
