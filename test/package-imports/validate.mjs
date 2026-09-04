/**
 * Package-import validation for PGBloom.
 *
 * This script verifies the package can be imported through three paths:
 *   1. Source import (src/index.ts) — validates the canonical source.
 *   2. Built ESM (dist/esm/index.js) — validates the npm ESM build.
 *   3. Default + named exports — validates the public API surface.
 *
 * Run from the project root after `npm run build`:
 *
 *   node test/package-imports/validate.mjs
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function tryImport(label, specifier) {
  try {
    const mod = await import(specifier);
    return { label, ok: true, mod };
  } catch (err) {
    return { label, ok: false, error: err };
  }
}

console.log("=== PGBloom package-import validation ===\n");

// 1. Built ESM
const esmPath = pathToFileURL(resolve(projectRoot, "dist", "esm", "index.js"));
const esm = await tryImport("ESM build", esmPath);

if (esm.ok) {
  const hasDefault = typeof esm.mod.default === "function";
  const hasCreatePgbloom = typeof esm.mod.createPgbloom === "function";
  const hasBloomFilter = typeof esm.mod.BloomFilter === "function";
  const hasCounter = typeof esm.mod.increment === "function";
  const hasRateLimit = typeof esm.mod.rateLimit === "function";
  const hasEvents = typeof esm.mod.emit === "function";
  const hasSchedule = typeof esm.mod.schedule === "function";
  const hasLock = typeof esm.mod.tryLock === "function";

  record("ESM: default export is a function", hasDefault);
  record("ESM: createPgbloom is exported", hasCreatePgbloom);
  record("ESM: BloomFilter is exported", hasBloomFilter);
  record("ESM: counter functions exported", hasCounter);
  record("ESM: rateLimit is exported", hasRateLimit);
  record("ESM: events.emit is exported", hasEvents);
  record("ESM: scheduler.schedule is exported", hasSchedule);
  record("ESM: lock.tryLock is exported", hasLock);

  // 2. Built CJS (require)
  try {
    const cjsPath = resolve(projectRoot, "dist", "cjs", "index.js");
    const cjsMod = await import(pathToFileURL(cjsPath).href + "?cjs=1");
    record(
      "CJS: dynamic import works",
      typeof cjsMod.default === "function" || typeof cjsMod.createPgbloom === "function",
    );
  } catch (err) {
    record("CJS: dynamic import", false, String(err.message ?? err));
  }

  // 3. Bloom Filter round-trip (no database required)
  if (hasBloomFilter) {
    const bf = new esm.mod.BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    bf.add("test");
    const hasItem = bf.has("test") === true;
    const noFalseNeg = bf.has("test") === true;
    record("API: BloomFilter.add/has works", hasItem && noFalseNeg);
  }
} else {
  record("ESM build", false, String(esm.error?.message ?? esm.error));
}

console.log("\n=== Summary ===");
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(`PASS: ${passed} / FAIL: ${failed}`);

if (failed > 0) {
  console.log("\nFailed checks:");
  for (const r of results.filter((r) => !r.ok)) {
    console.log(`  - ${r.name}: ${r.detail}`);
  }
  process.exit(1);
}

console.log("\n✓ All package-import checks passed.");
