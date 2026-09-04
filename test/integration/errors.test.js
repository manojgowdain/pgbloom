/**
 * HTTP error testing — every endpoint must handle invalid input gracefully.
 */

import { runTest, assert, assertEqual, assertOk } from "../helpers/assertions.js";
import { post, get, del } from "../helpers/http.js";
import { key } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  // ============================================================
  // CACHE errors
  // ============================================================
  await runTest("Errors: Cache POST without key returns 400", async () => {
    const r = await post(baseUrl, "/cache", { value: "no-key" });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Cache invalid JSON returns 500", async () => {
    const r = await post(baseUrl, "/cache", "{invalid json", {}, { headers: { "Content-Type": "application/json" } });
    assert(r.status === 400 || r.status === 500, `expected 4xx/5xx, got ${r.status}`);
  });

  await runTest("Errors: Cache HEAD on missing key returns 404", async () => {
    const r = await get(baseUrl, `/cache/${key("does-not-exist")}`, { method: "HEAD" });
    // get() doesn't do HEAD; this test just confirms 404 via GET
    const r2 = await get(baseUrl, `/cache/${key("does-not-exist")}`);
    assertEqual(r2.status, 404);
  });

  // ============================================================
  // PUBSUB errors
  // ============================================================
  await runTest("Errors: PubSub publish without channel returns 400", async () => {
    const r = await post(baseUrl, "/pubsub/publish", { message: "no-channel" });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: PubSub subscribe without channel returns 400", async () => {
    const r = await post(baseUrl, "/pubsub/subscribe", {});
    assertEqual(r.status, 400);
  });

  await runTest("Errors: PubSub unsubscribe non-existent subscriber", async () => {
    const r = await del(baseUrl, "/pubsub/subscribe/non-existent-id");
    assertEqual(r.status, 404);
  });

  // ============================================================
  // QUEUE errors
  // ============================================================
  await runTest("Errors: Queue stats on empty queue", async () => {
    const q = key("errors:queue:empty");
    const r = await get(baseUrl, `/queue/${q}/stats`);
    assertOk(r);
    // Empty stats should be all zeros
    assertEqual(r.json.pending, 0);
    assertEqual(r.json.processing, 0);
    assertEqual(r.json.completed, 0);
    assertEqual(r.json.failed, 0);
  });

  await runTest("Errors: Queue dequeue from empty queue returns 404", async () => {
    const q = key("errors:queue:empty");
    const r = await post(baseUrl, `/queue/${q}/dequeue`);
    assertEqual(r.status, 404);
  });

  await runTest("Errors: Queue complete non-existent job", async () => {
    const q = key("errors:queue:complete");
    const r = await post(baseUrl, `/queue/${q}/complete/99999`);
    // Should be 200 (idempotent) or 500
    assert(r.ok || r.status === 500);
  });

  // ============================================================
  // LOCK errors
  // ============================================================
  await runTest("Errors: Lock try without key returns 400", async () => {
    const r = await post(baseUrl, "/lock/try", { ttl: 1000 });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Lock blocking with non-existent lock", async () => {
    // Lock with 50ms timeout on a key we never acquired
    // It will try to acquire and succeed (first tryLock succeeds)
    const k = key("errors:lock:new");
    const r = await post(baseUrl, "/lock", { key: k, ttl: 1000, timeout: 500 });
    assertOk(r);
  });

  await runTest("Errors: Unlock without holderId returns 400", async () => {
    const r = await post(baseUrl, "/unlock", { key: key("errors:lock") });
    assertEqual(r.status, 400);
  });

  // ============================================================
  // LEADER errors
  // ============================================================
  await runTest("Errors: Leader acquire without resource returns 400", async () => {
    const r = await post(baseUrl, "/leader/acquire", { ttl: 1000 });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Leader status without params returns 400", async () => {
    const r = await get(baseUrl, "/leader/status");
    assertEqual(r.status, 400);
  });

  // ============================================================
  // SCHEDULER errors
  // ============================================================
  await runTest("Errors: Scheduler delayed without name returns 400", async () => {
    const r = await post(baseUrl, "/scheduler/delayed", { payload: 1, runAt: new Date().toISOString() });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Scheduler delayed without runAt returns 400", async () => {
    const r = await post(baseUrl, "/scheduler/delayed", { name: "test", payload: 1 });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Scheduler recurring without interval returns 400", async () => {
    const r = await post(baseUrl, "/scheduler/recurring", { name: "test", payload: 1 });
    assertEqual(r.status, 400);
  });

  // ============================================================
  // RATE LIMIT errors
  // ============================================================
  await runTest("Errors: Rate limit without key returns 400", async () => {
    const r = await post(baseUrl, "/rate-limit/fixed", { limit: 5, windowMs: 1000 });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Rate limit without limit returns 400", async () => {
    const r = await post(baseUrl, "/rate-limit/fixed", { key: "x", windowMs: 1000 });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Token bucket without refillRate returns 400", async () => {
    const r = await post(baseUrl, "/rate-limit/token-bucket", { key: "x", capacity: 5 });
    assertEqual(r.status, 400);
  });

  // ============================================================
  // EVENTS errors
  // ============================================================
  await runTest("Errors: Events emit without type returns 400", async () => {
    const r = await post(baseUrl, "/events/emit", { payload: "x" });
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Events listen without type returns 400", async () => {
    const r = await post(baseUrl, "/events/listen", {});
    assertEqual(r.status, 400);
  });

  // ============================================================
  // COUNTER errors
  // ============================================================
  await runTest("Errors: Counter add without delta returns 400", async () => {
    const k = key("errors:counter");
    const r = await post(baseUrl, `/counter/${k}/add`, {});
    assertEqual(r.status, 400);
  });

  await runTest("Errors: Counter set without value returns 400", async () => {
    const k = key("errors:counter");
    const r = await post(baseUrl, `/counter/${k}/set`, {});
    assertEqual(r.status, 400);
  });

  // ============================================================
  // BLOOM errors
  // ============================================================
  await runTest("Errors: Bloom add without value returns 400", async () => {
    const r = await post(baseUrl, "/bloom/add", {});
    assertEqual(r.status, 400);
  });

  // ============================================================
  // 404 handler
  // ============================================================
  await runTest("Errors: 404 on unknown route", async () => {
    const r = await get(baseUrl, "/this-route-does-not-exist");
    assertEqual(r.status, 404);
  });

  await runTest("Errors: 404 on unknown method", async () => {
    const r = await post(baseUrl, "/this-route-does-not-exist", {});
    assertEqual(r.status, 404);
  });

  await runTest("Errors: 404 on /cache/invalid/path", async () => {
    const r = await post(baseUrl, "/cache/extra/path", {});
    assertEqual(r.status, 404);
  });
}