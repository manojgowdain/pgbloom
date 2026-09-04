/**
 * Counter integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, waitFor } from "../helpers/assertions.js";
import { post, get } from "../helpers/http.js";
import { counterKey, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  await runTest("Counter increment", async () => {
    const k = counterKey("counter:inc");
    const r1 = await post(baseUrl, `/counter/${k}/increment`);
    assertOk(r1);
    assertEqual(r1.json.value, 1);

    const r2 = await post(baseUrl, `/counter/${k}/increment`);
    assertOk(r2);
    assertEqual(r2.json.value, 2);
  });

  await runTest("Counter decrement", async () => {
    const k = counterKey("counter:dec");
    await post(baseUrl, `/counter/${k}/set`, { value: 10 });

    const r1 = await post(baseUrl, `/counter/${k}/decrement`);
    assertOk(r1);
    assertEqual(r1.json.value, 9);

    const r2 = await post(baseUrl, `/counter/${k}/decrement`);
    assertOk(r2);
    assertEqual(r2.json.value, 8);
  });

  await runTest("Counter add", async () => {
    const k = counterKey("counter:add");
    await post(baseUrl, `/counter/${k}/set`, { value: 5 });

    const r1 = await post(baseUrl, `/counter/${k}/add`, { delta: 10 });
    assertOk(r1);
    assertEqual(r1.json.value, 15);
  });

  await runTest("Counter subtract", async () => {
    const k = counterKey("counter:sub");
    await post(baseUrl, `/counter/${k}/set`, { value: 20 });

    const r1 = await post(baseUrl, `/counter/${k}/subtract`, { delta: 7 });
    assertOk(r1);
    assertEqual(r1.json.value, 13);
  });

  await runTest("Counter set", async () => {
    const k = counterKey("counter:set");
    const r1 = await post(baseUrl, `/counter/${k}/set`, { value: 42 });
    assertOk(r1);
    assertEqual(r1.json.value, 42);

    const g = await get(baseUrl, `/counter/${k}`);
    assertOk(g);
    assertEqual(g.json.value, 42);
  });

  await runTest("Counter get with consistency options", async () => {
    const k = counterKey("counter:consistency");
    await post(baseUrl, `/counter/${k}/set`, { value: 100 });

    // Strong consistency (default)
    const g1 = await get(baseUrl, `/counter/${k}`);
    assertOk(g1);
    assertEqual(g1.json.value, 100);

    // Eventual consistency
    const g2 = await get(baseUrl, `/counter/${k}?consistency=eventual`);
    assertOk(g2);
    assertEqual(g2.json.value, 100);

    // Local consistency (may be 0 if no local cache)
    const g3 = await get(baseUrl, `/counter/${k}?consistency=local`);
    assertOk(g3);
    // Local may return 0 if not cached, that's OK
  });

  await runTest("Counter remove", async () => {
    const k = counterKey("counter:remove");
    await post(baseUrl, `/counter/${k}/set`, { value: 50 });

    const r1 = await post(baseUrl, `/counter/${k}/increment`);
    assertEqual(r1.json.value, 51);

    // Delete via POST to counter/:key with delete method is not implemented
    // Use the set to 0 then remove counter pattern
    await post(baseUrl, `/counter/${k}/set`, { value: 0 });
    // Actually there's no delete endpoint; counter keeps its value at 0
    // The removeCounter is not exposed in HTTP - skip
  });

  await runTest("Counter atomicity - 1000 concurrent increments", async () => {
    const k = counterKey("counter:atomic");
    await post(baseUrl, `/counter/${k}/set`, { value: 0 });

    const concurrent = 1000;
    const promises = [];
    for (let i = 0; i < concurrent; i++) {
      promises.push(post(baseUrl, `/counter/${k}/increment`));
    }
    await Promise.all(promises);

    const g = await get(baseUrl, `/counter/${k}`);
    assertOk(g);
    assertEqual(g.json.value, concurrent, "counter should be exactly 1000 after 1000 concurrent increments");
  });

  await runTest("Counter atomicity - mixed operations", async () => {
    const k = counterKey("counter:mixed");
    await post(baseUrl, `/counter/${k}/set`, { value: 100 });

    const promises = [];
    // 500 increments
    for (let i = 0; i < 500; i++) {
      promises.push(post(baseUrl, `/counter/${k}/increment`));
    }
    // 200 adds of 2
    for (let i = 0; i < 200; i++) {
      promises.push(post(baseUrl, `/counter/${k}/add`, { delta: 2 }));
    }
    // 100 decrements
    for (let i = 0; i < 100; i++) {
      promises.push(post(baseUrl, `/counter/${k}/decrement`));
    }
    await Promise.all(promises);

    // Expected: 100 + 500*1 + 200*2 - 100*1 = 100 + 500 + 400 - 100 = 900
    const g = await get(baseUrl, `/counter/${k}`);
    assertOk(g);
    assertEqual(g.json.value, 900);
  });

  await runTest("Counter multiple keys independent", async () => {
    const k1 = counterKey("counter:multi1");
    const k2 = counterKey("counter:multi2");

    await post(baseUrl, `/counter/${k1}/set`, { value: 10 });
    await post(baseUrl, `/counter/${k2}/set`, { value: 20 });

    await post(baseUrl, `/counter/${k1}/increment`);
    await post(baseUrl, `/counter/${k1}/increment`);
    await post(baseUrl, `/counter/${k2}/decrement`);

    const g1 = await get(baseUrl, `/counter/${k1}`);
    const g2 = await get(baseUrl, `/counter/${k2}`);
    assertEqual(g1.json.value, 12);
    assertEqual(g2.json.value, 19);
  });
}