/**
 * Leader election integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, waitFor } from "../helpers/assertions.js";
import { post, get } from "../helpers/http.js";
import { resourceKey, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  await runTest("Leader acquire - first becomes leader", async () => {
    const res = resourceKey("leader:basic");
    const r = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
    assertOk(r);
    assert(r.json.holderId, "should return holderId");
    assertEqual(typeof r.json.holderId, "string");
  });

  await runTest("Leader acquire - second gets 409 when leader exists", async () => {
    const res = resourceKey("leader:contention");
    // First acquires
    const r1 = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
    assertOk(r1);
    const holderId = r1.json.holderId;

    // Second should get conflict
    const r2 = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
    assertEqual(r2.status, 409);
    assertEqual(r2.json.error, "leader already exists");

    // Check status
    const status = await get(baseUrl, `/leader/status?resource=${res}&holderId=${holderId}`);
    assertOk(status);
    assertEqual(status.json.isLeader, true);

    // Release
    await post(baseUrl, "/leader/release", { resource: res, holderId });
  });

  await runTest("Leader release allows new leader", async () => {
    const res = resourceKey("leader:release");
    const r1 = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
    assertOk(r1);
    const holderId1 = r1.json.holderId;

    // Release
    await post(baseUrl, "/leader/release", { resource: res, holderId: holderId1 });

    // New leader can acquire
    const r2 = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
    assertOk(r2);
    assert(r2.json.holderId);
    assert(r2.json.holderId !== holderId1);

    await post(baseUrl, "/leader/release", { resource: res, holderId: r2.json.holderId });
  });

  await runTest("Leader TTL expiration", async () => {
    const res = resourceKey("leader:ttl");
    const r1 = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 100 }); // 100ms
    assertOk(r1);
    const holderId = r1.json.holderId;

    await sleep(200); // wait for TTL expiration

    // Should be able to acquire again
    const r2 = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
    assertOk(r2);
    assert(r2.json.holderId);
    assert(r2.json.holderId !== holderId);

    await post(baseUrl, "/leader/release", { resource: res, holderId: r2.json.holderId });
  });

  await runTest("Leader status check", async () => {
    const res = resourceKey("leader:status");
    const r1 = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
    assertOk(r1);
    const holderId = r1.json.holderId;

    const status = await get(baseUrl, `/leader/status?resource=${res}&holderId=${holderId}`);
    assertOk(status);
    assertEqual(status.json.isLeader, true);

    // Wrong holderId should return false
    const status2 = await get(baseUrl, `/leader/status?resource=${res}&holderId=wrong-id`);
    assertOk(status2);
    assertEqual(status2.json.isLeader, false);

    await post(baseUrl, "/leader/release", { resource: res, holderId });
  });

  await runTest("Multi-server leader election simulation", async () => {
    // Simulate 3 "servers" competing for leadership
    const res = resourceKey("leader:multi");
    const servers = [];

    for (let i = 0; i < 3; i++) {
      const r = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
      if (r.ok) {
        servers.push({ id: i, holderId: r.json.holderId, leader: true });
      } else {
        servers.push({ id: i, leader: false });
      }
    }

    const leaders = servers.filter(s => s.leader);
    assertEqual(leaders.length, 1, "exactly one leader elected");

    // Release the leader
    await post(baseUrl, "/leader/release", { resource: res, holderId: leaders[0].holderId });

    // Another should be able to acquire
    const r = await post(baseUrl, "/leader/acquire", { resource: res, ttl: 10000 });
    assertOk(r);
    assert(r.json.holderId);

    await post(baseUrl, "/leader/release", { resource: res, holderId: r.json.holderId });
  });
}