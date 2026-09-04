/**
 * Rate limit integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, waitFor } from "../helpers/assertions.js";
import { post } from "../helpers/http.js";
import { key, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  await runTest("Rate limit fixed window - basic limit", async () => {
    const k = key("ratelimit:fixed:basic");
    const limit = 5;
    const windowMs = 60000;

    // Make 5 requests - all should be allowed
    for (let i = 0; i < limit; i++) {
      const r = await post(baseUrl, "/rate-limit/fixed", { key: k, limit, windowMs });
      assertOk(r);
      assertEqual(r.json.allowed, true);
      assertEqual(r.json.limit, limit);
      assertEqual(r.json.remaining, limit - i - 1);
    }

    // 6th request should be rejected
    const r6 = await post(baseUrl, "/rate-limit/fixed", { key: k, limit, windowMs });
    assertOk(r6);
    assertEqual(r6.json.allowed, false);
    assertEqual(r6.json.remaining, 0);
  });

  await runTest("Rate limit fixed window - separate keys independent", async () => {
    const k1 = key("ratelimit:fixed:key1");
    const k2 = key("ratelimit:fixed:key2");
    const limit = 3;
    const windowMs = 60000;

    // Exhaust k1
    for (let i = 0; i < limit; i++) {
      const r = await post(baseUrl, "/rate-limit/fixed", { key: k1, limit, windowMs });
      assertOk(r);
      assertEqual(r.json.allowed, true);
    }
    const r1 = await post(baseUrl, "/rate-limit/fixed", { key: k1, limit, windowMs });
    assertEqual(r1.json.allowed, false);

    // k2 should still have full quota
    const r2 = await post(baseUrl, "/rate-limit/fixed", { key: k2, limit, windowMs });
    assertOk(r2);
    assertEqual(r2.json.allowed, true);
    assertEqual(r2.json.remaining, limit - 1);
  });

  await runTest("Rate limit sliding window - basic limit", async () => {
    const k = key("ratelimit:sliding:basic");
    const limit = 3;
    const windowMs = 2000; // 2 second window

    // 3 requests should be allowed
    for (let i = 0; i < limit; i++) {
      const r = await post(baseUrl, "/rate-limit/sliding", { key: k, limit, windowMs });
      assertOk(r);
      assertEqual(r.json.allowed, true);
    }

    // 4th should be rejected
    const r4 = await post(baseUrl, "/rate-limit/sliding", { key: k, limit, windowMs });
    assertOk(r4);
    assertEqual(r4.json.allowed, false);

    // Wait for window to slide
    await sleep(2100);

    // Should be allowed again
    const r5 = await post(baseUrl, "/rate-limit/sliding", { key: k, limit, windowMs });
    assertOk(r5);
    assertEqual(r5.json.allowed, true);
  });

  await runTest("Rate limit token bucket - basic", async () => {
    const k = key("ratelimit:token:basic");
    const capacity = 5;
    const refillRate = 1; // 1 token per second

    // Burst 5 requests - all allowed
    for (let i = 0; i < capacity; i++) {
      const r = await post(baseUrl, "/rate-limit/token-bucket", { key: k, capacity, refillRate });
      assertOk(r);
      assertEqual(r.json.allowed, true);
      assertEqual(r.json.limit, capacity);
      assertEqual(r.json.remaining, capacity - i - 1);
    }

    // 6th should be rejected
    const r6 = await post(baseUrl, "/rate-limit/token-bucket", { key: k, capacity, refillRate });
    assertOk(r6);
    assertEqual(r6.json.allowed, false);
    assertEqual(r6.json.remaining, 0);

    // Wait for refill (1 token per second)
    await sleep(1100);

    // Should have 1 token
    const r7 = await post(baseUrl, "/rate-limit/token-bucket", { key: k, capacity, refillRate });
    assertOk(r7);
    assertEqual(r7.json.allowed, true);
    assertEqual(r7.json.remaining, 0);
  });

  await runTest("Rate limit token bucket - burst capacity", async () => {
    const k = key("ratelimit:token:burst");
    const capacity = 10;
    const refillRate = 5; // 5 tokens per second

    // Burst 10 immediately
    for (let i = 0; i < capacity; i++) {
      const r = await post(baseUrl, "/rate-limit/token-bucket", { key: k, capacity, refillRate });
      assertOk(r);
      assertEqual(r.json.allowed, true);
    }

    const r11 = await post(baseUrl, "/rate-limit/token-bucket", { key: k, capacity, refillRate });
    assertEqual(r11.json.allowed, false);
  });

  await runTest("Rate limit concurrency - 100 concurrent requests", async () => {
    const k = key("ratelimit:concurrent");
    const limit = 10;
    const windowMs = 60000;

    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(post(baseUrl, "/rate-limit/fixed", { key: k, limit, windowMs }));
    }
    const results = await Promise.all(promises);

    const allowed = results.filter(r => r.ok && r.json.allowed === true).length;
    const rejected = results.filter(r => r.ok && r.json.allowed === false).length;

    assertEqual(allowed, limit, `exactly ${limit} should be allowed`);
    assertEqual(rejected, 100 - limit, `exactly ${100 - limit} should be rejected`);
  });

  await runTest("Rate limit different algorithms independent", async () => {
    const k = key("ratelimit:algo:independent");
    const limit = 2;
    const windowMs = 60000;
    const capacity = 2;
    const refillRate = 1;

    // Exhaust fixed window
    await post(baseUrl, "/rate-limit/fixed", { key: k, limit, windowMs });
    await post(baseUrl, "/rate-limit/fixed", { key: k, limit, windowMs });
    const r1 = await post(baseUrl, "/rate-limit/fixed", { key: k, limit, windowMs });
    assertEqual(r1.json.allowed, false);

    // Token bucket should still work (separate storage per algorithm)
    const r2 = await post(baseUrl, "/rate-limit/token-bucket", { key: k, capacity, refillRate });
    assertOk(r2);
    assertEqual(r2.json.allowed, true);

    const r3 = await post(baseUrl, "/rate-limit/token-bucket", { key: k, capacity, refillRate });
    assertEqual(r3.json.allowed, true);

    const r4 = await post(baseUrl, "/rate-limit/token-bucket", { key: k, capacity, refillRate });
    assertEqual(r4.json.allowed, false);
  });
}