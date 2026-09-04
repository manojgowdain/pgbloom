/**
 * Queue integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, assertDeepEqual, waitFor } from "../helpers/assertions.js";
import { post, get } from "../helpers/http.js";
import { queueName, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  await runTest("Queue enqueue and dequeue", async () => {
    const q = queueName("queue:basic");
    const payload = { type: "email", userId: 123, data: "test" };

    const enq = await post(baseUrl, `/queue/${q}/enqueue`, { payload });
    assertOk(enq);
    const jobId = enq.json.id;

    const deq = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq);
    assertEqual(deq.json.id, jobId);
    assertEqual(deq.json.payload.type, payload.type);
    assertEqual(deq.json.payload.userId, payload.userId);
    assertEqual(deq.json.payload.data, payload.data);
    assertEqual(deq.json.attempts, 1);
    assertEqual(deq.json.status, "processing");
  });

  await runTest("Queue complete job", async () => {
    const q = queueName("queue:complete");
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: { task: "complete" } });
    const deq = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq);
    const jobId = deq.json.id;

    const complete = await post(baseUrl, `/queue/${q}/complete/${jobId}`);
    assertOk(complete);

    const stats = await get(baseUrl, `/queue/${q}/stats`);
    assertOk(stats);
    assertEqual(stats.json.completed, 1);
    assertEqual(stats.json.pending, 0);
    assertEqual(stats.json.processing, 0);
  });

  await runTest("Queue fail job with retry", async () => {
    const q = queueName("queue:retry");
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: { task: "retry" }, maxAttempts: 3 });
    const deq1 = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq1);
    const jobId = deq1.json.id;

    // Fail first attempt
    await post(baseUrl, `/queue/${q}/fail/${jobId}`, { error: "temporary failure" });

    // Should be re-queued (status pending again)
    const stats1 = await get(baseUrl, `/queue/${q}/stats`);
    assertEqual(stats1.json.pending, 1);
    assertEqual(stats1.json.failed, 0);

    // Dequeue again
    const deq2 = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq2);
    assertEqual(deq2.json.attempts, 2);
    assertEqual(deq2.json.id, jobId);

    // Fail second attempt
    await post(baseUrl, `/queue/${q}/fail/${jobId}`, { error: "temporary failure 2" });
    const stats2 = await get(baseUrl, `/queue/${q}/stats`);
    assertEqual(stats2.json.pending, 1);

    // Third attempt
    const deq3 = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq3);
    assertEqual(deq3.json.attempts, 3);

    // Complete on third attempt
    await post(baseUrl, `/queue/${q}/complete/${jobId}`);
    const stats3 = await get(baseUrl, `/queue/${q}/stats`);
    assertEqual(stats3.json.completed, 1);
    assertEqual(stats3.json.failed, 0);
  });

  await runTest("Queue dead letter after max attempts", async () => {
    const q = queueName("queue:deadletter");
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: { task: "fail" }, maxAttempts: 2 });
    const deq1 = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq1);
    const jobId = deq1.json.id;

    await post(baseUrl, `/queue/${q}/fail/${jobId}`, { error: "fail 1" });
    const deq2 = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq2);

    await post(baseUrl, `/queue/${q}/fail/${jobId}`, { error: "fail 2 - max attempts" });

    const stats = await get(baseUrl, `/queue/${q}/stats`);
    assertEqual(stats.json.failed, 1);
    assertEqual(stats.json.pending, 0);
  });

  await runTest("Queue priority ordering", async () => {
    const q = queueName("queue:priority");
    // Low priority first
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: { p: "low" }, priority: 1 });
    // High priority second
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: { p: "high" }, priority: 100 });
    // Medium priority third
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: { p: "medium" }, priority: 10 });

    const j1 = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(j1);
    assertEqual(j1.json.payload.p, "high");

    const j2 = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(j2);
    assertEqual(j2.json.payload.p, "medium");

    const j3 = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(j3);
    assertEqual(j3.json.payload.p, "low");
  });

  await runTest("Queue stats", async () => {
    const q = queueName("queue:stats");
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: 1 });
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: 2 });
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: 3 });

    const deq = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq);
    await post(baseUrl, `/queue/${q}/complete/${deq.json.id}`);

    const stats = await get(baseUrl, `/queue/${q}/stats`);
    assertOk(stats);
    assertEqual(stats.json.pending, 2);
    assertEqual(stats.json.completed, 1);
  });

  await runTest("Queue cleanup", async () => {
    const q = queueName("queue:cleanup");
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: "old" });
    const deq = await post(baseUrl, `/queue/${q}/dequeue`);
    await post(baseUrl, `/queue/${q}/complete/${deq.json.id}`);

    // Wait briefly
    await sleep(100);

    const cleaned = await post(baseUrl, `/queue/${q}/cleanup`, { olderThan: new Date(Date.now() + 1000).toISOString() });
    assertOk(cleaned);
    assert(cleaned.json.deleted >= 1, "should clean up completed jobs");
  });

  await runTest("Queue payload preservation", async () => {
    const q = queueName("queue:payload");
    const complex = {
      nested: { deep: { value: [1, 2, { x: "y" }] } },
      arr: ["a", "b", "c"],
      num: 3.14,
      bool: false,
      nul: null,
    };
    await post(baseUrl, `/queue/${q}/enqueue`, { payload: complex });
    const deq = await post(baseUrl, `/queue/${q}/dequeue`);
    assertOk(deq);
    assertEqual(deq.json.payload.nested.deep.value[0], 1);
    assertEqual(deq.json.payload.nested.deep.value[2].x, "y");
    assertEqual(deq.json.payload.arr[0], "a");
    assertEqual(deq.json.payload.num, 3.14);
    assertEqual(deq.json.payload.bool, false);
    assertEqual(deq.json.payload.nul, null);
  });

  await runTest("Queue concurrent workers (100 jobs)", async () => {
    const q = queueName("queue:concurrent");
    const totalJobs = 100;

    // Enqueue 100 jobs
    const enqPromises = [];
    for (let i = 0; i < totalJobs; i++) {
      enqPromises.push(post(baseUrl, `/queue/${q}/enqueue`, { payload: { idx: i } }));
    }
    await Promise.all(enqPromises);

    // Dequeue all
    const jobs = [];
    for (let i = 0; i < totalJobs; i++) {
      const deq = await post(baseUrl, `/queue/${q}/dequeue`);
      if (deq.ok) {
        jobs.push(deq.json);
        await post(baseUrl, `/queue/${q}/complete/${deq.json.id}`);
      }
    }

    assertEqual(jobs.length, totalJobs, "all jobs should be dequeued");
    // Verify unique IDs
    const ids = new Set(jobs.map(j => j.id));
    assertEqual(ids.size, totalJobs, "all jobs should have unique IDs");

    const stats = await get(baseUrl, `/queue/${q}/stats`);
    assertEqual(stats.json.completed, totalJobs);
    assertEqual(stats.json.pending, 0);
    assertEqual(stats.json.failed, 0);
  });
}