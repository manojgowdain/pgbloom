import assert from "node:assert/strict";
import createPgbloom, { BloomFilter, createPgbloom as namedCreatePgbloom } from "../dist/esm/index.js";

assert.equal(createPgbloom, namedCreatePgbloom);
const bloom = new BloomFilter();
bloom.add("esm");
assert.equal(bloom.has("esm"), true);
console.log("ESM entrypoint smoke test passed.");
