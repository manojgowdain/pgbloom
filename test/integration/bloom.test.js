/**
 * Bloom filter integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, waitFor } from "../helpers/assertions.js";
import { post, get } from "../helpers/http.js";
import { key, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  // Bloom filter uses a singleton in the test server (globalThis._testBloom)
  // We need to reset it between tests
  await post(baseUrl, "/bloom/rebuild");

  await runTest("Bloom add and has", async () => {
    const k = key("bloom:basic");
    await post(baseUrl, "/bloom/add", { value: k });
    const r = await get(baseUrl, `/bloom/has/${k}`);
    assertOk(r);
    assertEqual(r.json.has, true);
  });

  await runTest("Bloom definitely not present", async () => {
    const k = key("bloom:missing");
    // Don't add it
    const r = await get(baseUrl, `/bloom/has/${k}`);
    assertOk(r);
    // Could be false positive, but we don't assert on it
    // Just verify the endpoint works
  });

  await runTest("Bloom multiple items", async () => {
    const items = Array.from({ length: 100 }, (_, i) => key(`bloom:multi:${i}`));
    for (const item of items) {
      await post(baseUrl, "/bloom/add", { value: item });
    }

    // Check all are present
    for (const item of items) {
      const r = await get(baseUrl, `/bloom/has/${item}`);
      assertOk(r);
      assertEqual(r.json.has, true);
    }
  });

  await runTest("Bloom statistics", async () => {
    const stats = await get(baseUrl, "/bloom/statistics");
    assertOk(stats);
    assert(stats.json.size >= 100, "size should be at least 100");
    assert(stats.json.bitSize > 0);
    assert(stats.json.hashCount > 0);
  });

  await runTest("Bloom rebuild clears filter", async () => {
    const k = key("bloom:rebuild");
    await post(baseUrl, "/bloom/add", { value: k });
    let r = await get(baseUrl, `/bloom/has/${k}`);
    assertEqual(r.json.has, true);

    await post(baseUrl, "/bloom/rebuild");
    r = await get(baseUrl, `/bloom/has/${k}`);
    // After rebuild, the filter is empty
    assertEqual(r.json.has, false);
  });

  await runTest("Bloom false positive rate check", async () => {
    await post(baseUrl, "/bloom/rebuild");

    // Add 1000 items
    const items = Array.from({ length: 1000 }, (_, i) => key(`bloom:fp:${i}`));
    for (const item of items) {
      await post(baseUrl, "/bloom/add", { value: item });
    }

    // Check 1000 non-inserted items for false positives
    let falsePositives = 0;
    for (let i = 0; i < 1000; i++) {
      const testKey = key(`bloom:fp:test:${i}`);
      const r = await get(baseUrl, `/bloom/has/${testKey}`);
      if (r.json.has) falsePositives++;
    }

    const fpRate = falsePositives / 1000;
    // Target is 1% (0.01); allow some variance
    assert(fpRate < 0.05, `false positive rate ${fpRate} should be under 5%`);
  });

  await runTest("Bloom integration with cache - false positive still checks DB", async () => {
    // This test verifies that Bloom is just an optimization
    // A false positive in Bloom should still result in a DB lookup
    // Since we can't observe DB lookups directly from HTTP,
    // we just verify the cache still works correctly
    const k = key("bloom:cache");
    await post(baseUrl, "/cache", { key: k, value: "cache-value", ttl: 60000 });

    // Bloom might have this key or not
    const bloomR = await get(baseUrl, `/bloom/has/${k}`);

    // Cache should return the value regardless
    const cacheR = await get(baseUrl, `/cache/${k}`);
    assertOk(cacheR);
    assertEqual(cacheR.json.value, "cache-value");
  });
}