/**
 * Load test for PGBloom.
 *
 * Run with: node test/load/load.test.js
 *
 * Environment variables:
 *   CONCURRENCY=50         (default: 50)
 *   ITERATIONS=1000        (default: 1000)
 *   QUEUE_JOBS=1000        (default: 1000)
 *   EVENTS=1000            (default: 1000)
 *   COUNTER_INCREMENTS=1000 (default: 1000)
 */

import { createPgbloom } from "../dist/esm/index.js";
import { RUN_ID, key, queueName, counterKey, eventType, makeTempDir, cleanupDatabase } from "../helpers/test-data.js";
import { createLocalStore } from "../dist/esm/index.js";

const CONCURRENCY = Number(process.env.CONCURRENCY) || 50;
const ITERATIONS = Number(process.env.ITERATIONS) || 1000;
const QUEUE_JOBS = Number(process.env.QUEUE_JOBS) || 1000;
const EVENTS = Number(process.env.EVENTS) || 1000;
const COUNTER_INCREMENTS = Number(process.env.COUNTER_INCREMENTS) || 1000;

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL required");
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runLoadTest() {
  console.log("==================================================");
  console.log("PGBLOOM LOAD TEST");
  console.log("==================================================");
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Queue jobs: ${QUEUE_JOBS}`);
  console.log(`Events: ${EVENTS}`);
  console.log(`Counter increments: ${COUNTER_INCREMENTS}`);
  console.log("");

  // Setup
  const client = await createPgbloom(process.env.DATABASE_URL, {
    cleanupInterval: false,
    bloomFilter: true,
    bloom: { expectedItems: 10000, falsePositiveRate: 0.01, rebuildInterval: false },
    lock: { defaultTtl: 10000 },
    scheduler: { workerId: `load-${RUN_ID}` },
    queue: { visibilityTimeout: 1000, maxAttempts: 3 },
    events: { maxListenersPerType: 100 },
    counter: { defaultConsistency: "strong" },
    maxConnections: 20,
  });

  const localCacheDir = await makeTempDir("-load");
  const localStore = await createLocalStore({ path: localCacheDir, ttl: 60000, maxEntries: 10000 });

  // Stats
  const latencies = { cache: [], queue: [], events: [], counter: [], rateLimit: [] };
  let successCount = 0;
  let errorCount = 0;

  // ============================================================
  // 1. Cache load test
  // ============================================================
  console.log("Running cache load test...");
  const cacheStart = Date.now();
  const cachePromises = [];

  for (let i = 0; i < ITERATIONS; i++) {
    cachePromises.push((async () => {
      const k = key(`load:cache:${i}`);
      const v = { idx: i, data: "x".repeat(100) };
      const t0 = Date.now();
      await client.setCache(k, v, 60000);
      const t1 = Date.now();
      await client.getCache(k);
      const t2 = Date.now();
      latencies.cache.push(t2 - t0);
      successCount++;
    })());
  }

  // Run with concurrency limit
  for (let i = 0; i < cachePromises.length; i += CONCURRENCY) {
    const batch = cachePromises.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(p => p.catch(e => { errorCount++; console.error("Cache error:", e.message); })));
  }

  const cacheDuration = Date.now() - cacheStart;
  console.log(`  Cache: ${ITERATIONS} ops in ${cacheDuration}ms (${(ITERATIONS / cacheDuration * 1000).toFixed(1)} ops/sec)`);
  console.log(`  Latency: p50=${percentile(latencies.cache, 50)}ms p95=${percentile(latencies.cache, 95)}ms p99=${percentile(latencies.cache, 99)}ms`);

  // ============================================================
  // 2. Queue load test
  // ============================================================
  console.log("Running queue load test...");
  const q = queueName("load:queue");
  const queueStart = Date.now();
  const queuePromises = [];

  for (let i = 0; i < QUEUE_JOBS; i++) {
    queuePromises.push((async () => {
      const t0 = Date.now();
      const job = await client.enqueue(q, { idx: i });
      const t1 = Date.now();
      latencies.queue.push(t1 - t0);
      // Complete immediately
      await client.completeJob(job.id);
      successCount++;
    })());
  }

  for (let i = 0; i < queuePromises.length; i += CONCURRENCY) {
    const batch = queuePromises.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(p => p.catch(e => { errorCount++; console.error("Queue error:", e.message); })));
  }

  const queueDuration = Date.now() - queueStart;
  console.log(`  Queue: ${QUEUE_JOBS} jobs in ${queueDuration}ms (${(QUEUE_JOBS / queueDuration * 1000).toFixed(1)} jobs/sec)`);
  console.log(`  Latency: p50=${percentile(latencies.queue, 50)}ms p95=${percentile(latencies.queue, 95)}ms p99=${percentile(latencies.queue, 99)}ms`);

  // ============================================================
  // 3. Events load test
  // ============================================================
  console.log("Running events load test...");
  const type = eventType("load:events");
  const eventsStart = Date.now();
  const eventsPromises = [];

  for (let i = 0; i < EVENTS; i++) {
    eventsPromises.push((async () => {
      const t0 = Date.now();
      await client.emit(type, { idx: i });
      const t1 = Date.now();
      latencies.events.push(t1 - t0);
      successCount++;
    })());
  }

  for (let i = 0; i < eventsPromises.length; i += CONCURRENCY) {
    const batch = eventsPromises.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(p => p.catch(e => { errorCount++; console.error("Events error:", e.message); })));
  }

  const eventsDuration = Date.now() - eventsStart;
  console.log(`  Events: ${EVENTS} emits in ${eventsDuration}ms (${(EVENTS / eventsDuration * 1000).toFixed(1)} ops/sec)`);
  console.log(`  Latency: p50=${percentile(latencies.events, 50)}ms p95=${percentile(latencies.events, 95)}ms p99=${percentile(latencies.events, 99)}ms`);

  // ============================================================
  // 4. Counter load test
  // ============================================================
  console.log("Running counter load test...");
  const ck = counterKey("load:counter");
  await client.setCounter(ck, 0);
  const counterStart = Date.now();
  const counterPromises = [];

  for (let i = 0; i < COUNTER_INCREMENTS; i++) {
    counterPromises.push((async () => {
      const t0 = Date.now();
      await client.increment(ck);
      const t1 = Date.now();
      latencies.counter.push(t1 - t0);
      successCount++;
    })());
  }

  for (let i = 0; i < counterPromises.length; i += CONCURRENCY) {
    const batch = counterPromises.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(p => p.catch(e => { errorCount++; console.error("Counter error:", e.message); })));
  }

  const counterDuration = Date.now() - counterStart;
  const finalCounter = await client.getCounter(ck);
  console.log(`  Counter: ${COUNTER_INCREMENTS} increments in ${counterDuration}ms (${(COUNTER_INCREMENTS / counterDuration * 1000).toFixed(1)} ops/sec)`);
  console.log(`  Final value: ${finalCounter.value} (expected ${COUNTER_INCREMENTS})`);
  console.log(`  Latency: p50=${percentile(latencies.counter, 50)}ms p95=${percentile(latencies.counter, 95)}ms p99=${percentile(latencies.counter, 99)}ms`);

  // ============================================================
  // 5. Rate limit load test
  // ============================================================
  console.log("Running rate limit load test...");
  const rk = key("load:ratelimit");
  const rateLimitStart = Date.now();
  const rateLimitPromises = [];

  for (let i = 0; i < ITERATIONS; i++) {
    rateLimitPromises.push((async () => {
      const t0 = Date.now();
      await client.rateLimit(rk, 10000, 60000); // High limit
      const t1 = Date.now();
      latencies.rateLimit.push(t1 - t0);
      successCount++;
    })());
  }

  for (let i = 0; i < rateLimitPromises.length; i += CONCURRENCY) {
    const batch = rateLimitPromises.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(p => p.catch(e => { errorCount++; console.error("RateLimit error:", e.message); })));
  }

  const rateLimitDuration = Date.now() - rateLimitStart;
  console.log(`  RateLimit: ${ITERATIONS} checks in ${rateLimitDuration}ms (${(ITERATIONS / rateLimitDuration * 1000).toFixed(1)} ops/sec)`);
  console.log(`  Latency: p50=${percentile(latencies.rateLimit, 50)}ms p95=${percentile(latencies.rateLimit, 95)}ms p99=${percentile(latencies.rateLimit, 99)}ms`);

  // ============================================================
  // Summary
  // ============================================================
  const totalDuration = cacheDuration + queueDuration + eventsDuration + counterDuration + rateLimitDuration;
  const totalOps = ITERATIONS + QUEUE_JOBS + EVENTS + COUNTER_INCREMENTS + ITERATIONS;

  console.log("");
  console.log("==================================================");
  console.log("LOAD TEST SUMMARY");
  console.log("==================================================");
  console.log(`Total operations: ${totalOps}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Duration: ${totalDuration}ms`);
  console.log(`Throughput: ${(totalOps / totalDuration * 1000).toFixed(1)} ops/sec`);
  console.log("");

  // Per-operation summary
  const allLatencies = [...latencies.cache, ...latencies.queue, ...latencies.events, ...latencies.counter, ...latencies.rateLimit];
  console.log("Overall Latency:");
  console.log(`  p50: ${percentile(allLatencies, 50)}ms`);
  console.log(`  p95: ${percentile(allLatencies, 95)}ms`);
  console.log(`  p99: ${percentile(allLatencies, 99)}ms`);
  console.log("");

  // Cleanup
  await cleanupDatabase(client);
  await client.close();
  await localStore.close();
  await import("node:fs/promises").then(fs => fs.rm(localCacheDir, { recursive: true, force: true }));

  console.log("==================================================");
  console.log("LOAD TEST COMPLETE");
  console.log("==================================================");

  if (errorCount > 0) {
    process.exit(1);
  }
}

runLoadTest().catch(e => {
  console.error("Load test failed:", e);
  process.exit(1);
});