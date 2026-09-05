/**
 * Browser entry point validation for PGBloom.
 *
 * Verifies that the browser bundle does NOT include Node.js-only dependencies
 * (pg, ssdiskdb, fs, net, tls, etc.).
 *
 * Run from project root after `npm run build`:
 *
 *   node test/package-imports/validate-browser.mjs
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");

console.log("=== PGBloom browser bundle validation ===\n");

const browserPath = pathToFileURL(resolve(projectRoot, "dist", "esm", "browser.js"));
const content = readFileSync(browserPath, "utf8");

const forbiddenPatterns = [
  { name: "PostgreSQL driver (pg)", pattern: /from\s+["']pg["']|require\s*\(\s*["']pg["']\s*\)/ },
  { name: "ssdiskdb", pattern: /from\s+["']ssdiskdb["']|require\s*\(\s*["']ssdiskdb["']\s*\)/ },
  { name: "node:fs", pattern: /from\s+["']node:fs["']|require\s*\(\s*["']node:fs["']\s*\)/ },
  { name: "node:net", pattern: /from\s+["']node:net["']|require\s*\(\s*["']node:net["']\s*\)/ },
  { name: "node:tls", pattern: /from\s+["']node:tls["']|require\s*\(\s*["']node:tls["']\s*\)/ },
  { name: "node:crypto", pattern: /from\s+["']node:crypto["']|require\s*\(\s*["']node:crypto["']\s*\)/ },
  { name: "node:path", pattern: /from\s+["']node:path["']|require\s*\(\s*["']node:path["']\s*\)/ },
];

let passed = 0;
let failed = 0;

for (const check of forbiddenPatterns) {
  const found = check.pattern.test(content);
  if (!found) {
    console.log(`✓ Browser bundle does NOT contain: ${check.name}`);
    passed++;
  } else {
    console.log(`✗ Browser bundle DOES contain: ${check.name}`);
    failed++;
  }
}

// Verify that browser bundle DOES contain expected exports
const requiredExports = [
  "BloomFilter",
  "BloomFilterError",
  "BloomFilterConfigError",
  "encodeValue",
  "fnv1a",
  "xorshift32",
  "hashPair",
  "validateKey",
  "serialize",
  "deserialize",
];

for (const name of requiredExports) {
  if (content.includes(name)) {
    console.log(`✓ Browser bundle exports: ${name}`);
    passed++;
  } else {
    console.log(`✗ Browser bundle missing export: ${name}`);
    failed++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`PASS: ${passed} / FAIL: ${failed}`);

if (failed > 0) {
  process.exit(1);
}

console.log("\n✓ Browser bundle validation passed.");
