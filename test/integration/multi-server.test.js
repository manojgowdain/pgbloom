/**
 * Multi-server integration tests.
 * Tests cross-server coordination with two servers sharing the same PostgreSQL.
 */

import { runTest, assert, assertEqual, assertOk, assertDeepEqual, waitFor } from "../helpers/assertions.js";
import { post, get, del } from "../helpers/http.js";
import { key, channel, queueName, counterKey, eventType, resourceKey, lockKey, sleep } from "../helpers/test-data.js";

/**
 * Runs multi-server tests between two server URLs.
 * @param {string} URL1 - First server base URL
 * @param {string} URL2 - Second server base URL
 */
export async function runTestsMulti(URL1, URL2) {
  // ============================================================
  // Cache invalidation test
  // ============================================================
  await runTest("Multi-server: cache invalidation across servers", async () => {
    const k = key("multisrv:cache");
    const val1 = { server: 1, data: "initial" };
    const val2 = { server: 2, data: "updated" };

    // Server 1 writes
    await post(URL1, "/cache", { key: k, value: val1, ttl: 60000 });

    // Server 2 reads - should see server 1's value
    let g2 = await get(URL2, `/cache/${k}`);
    assertOk(g2);
    assertDeepEqual(g2.json.value, val1);

    // Server 2 updates
    await post(URL2, "/cache", { key: k, value: val2, ttl: 60000 });

    // Server 1 reads - should see server 2's value
    let g1 = await get(URL1, `/cache/${k}`);
    assertOk(g1);
    assertDeepEqual(g1.json.value, val2);

    // Server 2 reads again - should see its own update
    g2 = await get(URL2, `/cache/${k}`);
    assertOk(g2);
    assertDeepEqual(g2.json.value, val2);
  });

  // ============================================================
  // Pub/Sub cross-server delivery
  // ============================================================
  await runTest("Multi-server: Pub/Sub delivery across servers", async () => {
    const ch = channel("multisrv:pubsub");

    // Subscribe on server 1
    const sub1 = await post(URL1, "/pubsub/subscribe", { channel: ch });
    assertOk(sub1);
    const subId1 = sub1.json.subscriberId;

    // Subscribe on server 2
    const sub2 = await post(URL2, "/pubsub/subscribe", { channel: ch });
    assertOk(sub2);
    const subId2 = sub2.json.subscriberId;

    // Publish from server 1
    await post(URL1, "/pubsub/publish", { channel: ch, message: { from: 1 } });

    // Both should receive
    await waitFor("sub1 receives", async () => {
      const m = await get(URL1, `/pubsub/messages/${subId1}`);
      return m.json.messages.length > 0;
    });
    await waitFor("sub2 receives", async () => {
      const m = await get(URL2, `/pubsub/messages/${subId2}`);
      return m.json.messages.length > 0;
    });

    const m1 = await get(URL1, `/pubsub/messages/${subId1}`);
    const m2 = await get(URL2, `/pubsub/messages/${subId2}`);
    assertEqual(m1.json.messages.length, 1);
    assertEqual(m2.json.messages.length, 1);

    // Cleanup
    await del(URL1, `/pubsub/subscribe/${subId1}`);
    await del(URL2, `/pubsub/subscribe/${subId2}`);
  });

  // ============================================================
  // Queue coordination
  // ============================================================
  await runTest("Multi-server: queue coordination", async () => {
    const q = queueName("multisrv:queue");

    // Enqueue from server 1
    await post(URL1, `/queue/${q}/enqueue`, { payload: { from: 1, task: "a" } });
    await post(URL1, `/queue/${q}/enqueue`, { payload: { from: 1, task: "b" } });

    // Dequeue from server 2
    const d1 = await post(URL2, `/queue/${q}/dequeue`);
    assertOk(d1);
    const d2 = await post(URL2, `/queue/${q}/dequeue`);
    assertOk(d2);

    // Complete from server 1
    await post(URL1, `/queue/${q}/complete/${d1.json.id}`);
    await post(URL1, `/queue/${q}/complete/${d2.json.id}`);

    const stats = await get(URL1, `/queue/${q}/stats`);
    assertEqual(stats.json.completed, 2);
    assertEqual(stats.json.pending, 0);
  });

  // ============================================================
  // Lock coordination
  // ============================================================
  await runTest("Multi-server: lock coordination", async () => {
    const k = lockKey("multisrv:lock");

    // Server 1 acquires
    const r1 = await post(URL1, "/lock/try", { key: k, ttl: 10000 });
    assertOk(r1);
    assertEqual(r1.json.acquired, true);

    // Server 2 should fail
    const r2 = await post(URL2, "/lock/try", { key: k, ttl: 10000 });
    assertOk(r2);
    assertEqual(r2.json.acquired, false);

    // Server 1 releases (let expire)
    await post(URL1, "/lock/try", { key: k, ttl: 1 });
    await sleep(50);

    // Server 2 can now acquire
    const r3 = await post(URL2, "/lock/try", { key: k, ttl: 10000 });
    assertOk(r3);
    assertEqual(r3.json.acquired, true);
  });

  // ============================================================
  // Leader election across servers
  // ============================================================
  await runTest("Multi-server: leader election", async () => {
    const res = resourceKey("multisrv:leader");

    // Both servers try to become leader
    const r1 = await post(URL1, "/leader/acquire", { resource: res, ttl: 10000 });
    const r2 = await post(URL2, "/leader/acquire", { resource: res, ttl: 10000 });

    // Exactly one should succeed
    const leaders = [r1, r2].filter(r => r.ok && r.json.holderId);
    assertEqual(leaders.length, 1, "exactly one leader");

    const holderId = leaders[0].json.holderId;
    const leaderUrl = r1.ok ? URL1 : URL2;

    // Leader check from both
    const status1 = await get(URL1, `/leader/status?resource=${res}&holderId=${holderId}`);
    const status2 = await get(URL2, `/leader/status?resource=${res}&holderId=${holderId}`);
    assertEqual(status1.json.isLeader, r1.ok);
    assertEqual(status2.json.isLeader, r2.ok);

    // Release
    await post(leaderUrl, "/leader/release", { resource: res, holderId });
  });

  // ============================================================
  // Global rate limit
  // ============================================================
  await runTest("Multi-server: global rate limit", async () => {
    const k = key("multisrv:ratelimit");
    const limit = 5;
    const windowMs = 60000;

    // 3 from server 1, 3 from server 2 = 6 total (limit is 5)
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(post(URL1, "/rate-limit/fixed", { key: k, limit, windowMs }));
      promises.push(post(URL2, "/rate-limit/fixed", { key: k, limit, windowMs }));
    }
    const results = await Promise.all(promises);
    const allowed = results.filter(r => r.ok && r.json.allowed === true).length;
    const rejected = results.filter(r => r.ok && r.json.allowed === false).length;

    assertEqual(allowed, limit, `global limit of ${limit} enforced across servers`);
    assertEqual(rejected, 6 - limit);
  });

  // ============================================================
  // Events cross-server
  // ============================================================
  await runTest("Multi-server: events delivery across servers", async () => {
    const type = eventType("multisrv:events");

    // Listen on server 1
    const lst1 = await post(URL1, "/events/listen", { type });
    assertOk(lst1);
    const lstId1 = lst1.json.listenerId;

    // Listen on server 2
    const lst2 = await post(URL2, "/events/listen", { type });
    assertOk(lst2);
    const lstId2 = lst2.json.listenerId;

    // Emit from server 1
    await post(URL1, "/events/emit", { type, payload: { from: 1 } });

    await waitFor("lst1 receives", async () => {
      const m = await get(URL1, `/events/messages/${lstId1}`);
      return m.json.events.length > 0;
    });
    await waitFor("lst2 receives", async () => {
      const m = await get(URL2, `/events/messages/${lstId2}`);
      return m.json.events.length > 0;
    });

    const e1 = await get(URL1, `/events/messages/${lstId1}`);
    const e2 = await get(URL2, `/events/messages/${lstId2}`);
    assertEqual(e1.json.events.length, 1);
    assertEqual(e2.json.events.length, 1);

    await del(URL1, `/events/listen/${lstId1}`);
    await del(URL2, `/events/listen/${lstId2}`);
  });

  // ============================================================
  // Counter atomicity across servers
  // ============================================================
  await runTest("Multi-server: counter atomicity across servers", async () => {
    const k = counterKey("multisrv:counter");
    await post(URL1, `/counter/${k}/set`, { value: 0 });

    // 50 increments from each server
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(post(URL1, `/counter/${k}/increment`));
      promises.push(post(URL2, `/counter/${k}/increment`));
    }
    await Promise.all(promises);

    const g = await get(URL1, `/counter/${k}`);
    assertOk(g);
    assertEqual(g.json.value, 100, "100 increments total across both servers");
  });
}

// Backwards compatibility - export runTests that does nothing (handled by runner)
export async function runTests(baseUrl) {
  // This is handled by run-tests.js via runTestsMulti
  console.log("  Multi-server tests run via runTestsMulti(URL1, URL2)");
}