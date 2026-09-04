/**
 * Concurrency integration tests via HTTP.
 * Tests 100+ concurrent operations across different features.
 */

import { runTest, assert, assertEqual, assertOk } from "../helpers/assertions.js";
import { post, get } from "../helpers/http.js";
import { key, channel, queueName, counterKey, eventType, lockKey } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  await runTest("Concurrency: 100 concurrent cache operations", async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      const k = key(`concurrent:cache:${i}`);
      const v = { idx: i, data: `value-${i}` };
      promises.push(post(baseUrl, "/cache", { key: k, value: v, ttl: 60000 }));
    }
    const results = await Promise.all(promises);
    const ok = results.filter(r => r.ok).length;
    assertEqual(ok, 100, "all 100 cache SET operations should succeed");

    // Verify all can be read
    const getPromises = [];
    for (let i = 0; i < 100; i++) {
      getPromises.push(get(baseUrl, `/cache/${key(`concurrent:cache:${i}`)}`));
    }
    const getResults = await Promise.all(getPromises);
    const getOk = getResults.filter(r => r.ok).length;
    assertEqual(getOk, 100, "all 100 cache GET operations should succeed");
  });

  await runTest("Concurrency: 100 concurrent counter increments", async () => {
    const k = counterKey("concurrent:counter");
    await post(baseUrl, `/counter/${k}/set`, { value: 0 });

    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(post(baseUrl, `/counter/${k}/increment`));
    }
    await Promise.all(promises);

    const g = await get(baseUrl, `/counter/${k}`);
    assertOk(g);
    assertEqual(g.json.value, 100, "counter should be exactly 100");
  });

  await runTest("Concurrency: 100 concurrent queue enqueues", async () => {
    const q = queueName("concurrent:queue");
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(post(baseUrl, `/queue/${q}/enqueue`, { payload: { idx: i } }));
    }
    const results = await Promise.all(promises);
    const ok = results.filter(r => r.ok).length;
    assertEqual(ok, 100, "all 100 enqueues should succeed");

    const stats = await get(baseUrl, `/queue/${q}/stats`);
    assertEqual(stats.json.pending, 100);
  });

  await runTest("Concurrency: 100 concurrent lock attempts (single lock)", async () => {
    const k = lockKey("concurrent:lock");
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(post(baseUrl, "/lock/try", { key: k, ttl: 10000 }));
    }
    const results = await Promise.all(promises);
    const acquired = results.filter(r => r.ok && r.json.acquired === true).length;
    assertEqual(acquired, 1, "exactly one should acquire the lock");
  });

  await runTest("Concurrency: 100 concurrent rate limit requests", async () => {
    const k = key("concurrent:ratelimit");
    const limit = 10;
    const windowMs = 60000;

    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(post(baseUrl, "/rate-limit/fixed", { key: k, limit, windowMs }));
    }
    const results = await Promise.all(promises);
    const allowed = results.filter(r => r.ok && r.json.allowed === true).length;
    assertEqual(allowed, limit, `exactly ${limit} should be allowed`);
  });

  await runTest("Concurrency: 100 concurrent event emissions", async () => {
    const type = eventType("concurrent:events");
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(post(baseUrl, "/events/emit", { type, payload: { idx: i } }));
    }
    const results = await Promise.all(promises);
    const ok = results.filter(r => r.ok).length;
    assertEqual(ok, 100, "all 100 event emissions should succeed");

    // Verify all events in history
    await new Promise(r => setTimeout(r, 200));
    const hist = await get(baseUrl, `/events/history?type=${type}&limit=200`);
    assertEqual(hist.json.events.length, 100);
  });

  await runTest("Concurrency: 100 concurrent pubsub publishes", async () => {
    const ch = channel("concurrent:pubsub");
    // Subscribe first
    const sub = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub);

    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(post(baseUrl, "/pubsub/publish", { channel: ch, message: { idx: i } }));
    }
    const results = await Promise.all(promises);
    const ok = results.filter(r => r.ok).length;
    assertEqual(ok, 100, "all 100 pubsub publishes should succeed");

    // Give time for delivery
    await new Promise(r => setTimeout(r, 500));
    const msgs = await get(baseUrl, `/pubsub/messages/${sub.json.subscriberId}`);
    // Should receive all 100 (or close to it)
    assert(msgs.json.messages.length >= 95, "should receive most messages");

    await post(baseUrl, `/pubsub/subscribe/${sub.json.subscriberId}`, {}, { method: "DELETE" });
  });

  await runTest("Concurrency: mixed operations (cache + counter + queue)", async () => {
    const promises = [];
    for (let i = 0; i < 33; i++) {
      promises.push(post(baseUrl, "/cache", { key: key(`mixed:cache:${i}`), value: i }));
      promises.push(post(baseUrl, `/counter/${counterKey(`mixed:cnt:${i}`)}/increment`));
      promises.push(post(baseUrl, `/queue/${queueName("mixed:queue")}/enqueue`, { payload: { idx: i } }));
    }
    const results = await Promise.all(promises);
    const ok = results.filter(r => r.ok).length;
    assertEqual(ok, 99, "all 99 mixed operations should succeed");
  });
}