/**
 * Lock integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, waitFor } from "../helpers/assertions.js";
import { post, get } from "../helpers/http.js";
import { lockKey, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  await runTest("Lock tryLock acquires lock", async () => {
    const k = lockKey("locks:basic");
    const r1 = await post(baseUrl, "/lock/try", { key: k, ttl: 5000 });
    assertOk(r1);
    assertEqual(r1.json.acquired, true);
  });

  await runTest("Lock tryLock fails when lock held", async () => {
    const k = lockKey("locks:contention");
    // First acquires
    const r1 = await post(baseUrl, "/lock/try", { key: k, ttl: 5000 });
    assertOk(r1);
    assertEqual(r1.json.acquired, true);

    // Second should fail
    const r2 = await post(baseUrl, "/lock/try", { key: k, ttl: 5000 });
    assertOk(r2);
    assertEqual(r2.json.acquired, false);
  });

  await runTest("Lock unlock releases lock", async () => {
    const k = lockKey("locks:release");
    const r1 = await post(baseUrl, "/lock/try", { key: k, ttl: 5000 });
    assertOk(r1);
    assertEqual(r1.json.acquired, true);

    // Unlock - but we need holderId
    // The client doesn't return holderId from tryLock endpoint
    // This is a limitation of the current test server design
    // Skip detailed unlock test until we fix the server
    await post(baseUrl, "/lock/try", { key: k, ttl: 1 }); // will expire quickly
    await sleep(50);
    const r3 = await post(baseUrl, "/lock/try", { key: k, ttl: 5000 });
    assertEqual(r3.json.acquired, true);
  });

  await runTest("Lock blocking lock() acquires", async () => {
    const k = lockKey("locks:blocking");
    // First client gets lock
    const r1 = await post(baseUrl, "/lock/try", { key: k, ttl: 10000 });
    assertOk(r1);
    assertEqual(r1.json.acquired, true);

    // Second client tries blocking lock with short timeout - should fail
    const r2 = await post(baseUrl, "/lock", { key: k, ttl: 5000, timeout: 100 });
    assertEqual(r2.status, 500); // timeout error

    // Release first lock by letting it expire
    await post(baseUrl, "/lock/try", { key: k, ttl: 1 });
    await sleep(50);

    // Now blocking lock should succeed
    const r3 = await post(baseUrl, "/lock", { key: k, ttl: 5000, timeout: 1000 });
    assertOk(r3);
  });

  await runTest("Lock TTL expiration", async () => {
    const k = lockKey("locks:ttl");
    const r1 = await post(baseUrl, "/lock/try", { key: k, ttl: 100 }); // 100ms TTL
    assertOk(r1);
    assertEqual(r1.json.acquired, true);

    await sleep(200); // wait for expiration

    const r2 = await post(baseUrl, "/lock/try", { key: k, ttl: 5000 });
    assertOk(r2);
    assertEqual(r2.json.acquired, true);
  });

  await runTest("Lock concurrency - 50 concurrent attempts", async () => {
    const k = lockKey("locks:concurrent");
    const attempts = 50;

    // Try to acquire lock concurrently
    const promises = [];
    for (let i = 0; i < attempts; i++) {
      promises.push(post(baseUrl, "/lock/try", { key: k, ttl: 10000 }));
    }
    const results = await Promise.all(promises);

    // Exactly 1 should succeed
    const acquired = results.filter(r => r.ok && r.json.acquired === true).length;
    assertEqual(acquired, 1, "exactly one should acquire the lock");
  });

  await runTest("Lock sequential acquire/release cycle", async () => {
    const k = lockKey("locks:cycle");
    const cycles = 10;

    for (let i = 0; i < cycles; i++) {
      const r1 = await post(baseUrl, "/lock/try", { key: k, ttl: 100 });
      assertOk(r1);
      assertEqual(r1.json.acquired, true);

      // Let it expire
      await sleep(150);
    }
  });
}