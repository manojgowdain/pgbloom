const assert = require("node:assert/strict");
const pkg = require("../dist/cjs/index.js");

assert.equal(typeof pkg.default, "function");
const bloom = new pkg.BloomFilter();
bloom.add("cjs");
assert.equal(bloom.has("cjs"), true);
console.log("CommonJS entrypoint smoke test passed.");
