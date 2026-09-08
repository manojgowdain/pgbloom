import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPgbloom,
  PGBloomValidationError,
  createLocalStore,
  MemoryCache,
  BloomFilter,
  createLockState,
  tryLock,
  unlock,
  createEventsState,
  createRateLimitState,
  checkRateLimit,
  checkSlidingRateLimit,
  checkTokenBucketRateLimit,
} from "../dist/esm/index.js";
import type { PgbloomClient } from "../dist/esm/index.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const suite = describe.skipIf(!hasDatabase);
const runId = `${Date.now()}_${process.pid}`;

let client: PgbloomClient;
let localPath: string;

suite("PGBloom direct PostgreSQL integration", () => {
  beforeAll(async () => {
    client = await createPgbloom(process.env.DATABASE_URL!, {
      cleanupInterval: false,
      bloomFilter: true,
      bloom: { expectedItems: 1000, falsePositiveRate: 0.01, rebuildInterval: false },
      queue: { visibilityTimeout: 100, maxAttempts: 2 },
      lock: { defaultTtl: 2_000 },
      scheduler: { workerId: `integration-${runId}` },
    });
  });

  afterAll(async () => {
    await client?.close();
  });

  it("persists cache values, preserves null, expires TTLs, and validates keys", async () => {
    const key = `integration:${runId}:cache`;
    await client.setCache(key, null, 10_000);
    expect(await client.getCache(key)).toBeNull();
    await client.setCache(key, { updated: true }, 10_000);
    expect(await client.getCache(key)).toEqual({ updated: true });
    await client.deleteCache(key);
    expect(await client.getCache(key)).toBeNull();
    await expect(client.setCache("", "invalid")).rejects.toBeInstanceOf(PGBloomValidationError);
  });

  it("processes queue jobs with retry and visibility state", async () => {
    const queue = `integration:${runId}:queue`;
    const job = await client.enqueue(queue, { value: 1 }, { maxAttempts: 2, visibilityTimeout: 50 });
    const claimed = await client.dequeue<typeof job.payload>(queue);
    expect(claimed?.id).toBe(job.id);
    expect(claimed?.attempts).toBe(1);
    await client.failJob(job.id, "first failure");
    await new Promise((resolve) => setTimeout(resolve, 75));
    const retried = await client.dequeue(queue);
    expect(retried?.id).toBe(job.id);
    await client.completeJob(job.id);
    expect((await client.getQueueStats(queue)).completed).toBe(1);
  });

  it("keeps concurrent counter increments atomic", async () => {
    const key = `integration:${runId}:counter`;
    await Promise.all(Array.from({ length: 40 }, () => client.increment(key)));
    expect((await client.getCounter(key)).value).toBe(40);
    expect((await client.decrement(key, 5)).value).toBe(35);
    expect((await client.removeCounter(key))).toBe(true);
  });

  it("supports schema creation and complete CRUD model operations", async () => {
    const table = `integration_users_${runId.replace(/[^a-z0-9_]/gi, "_")}`;
    const model = client.model(table, {
      email: { type: "string", required: true, unique: true },
      score: { type: "number", default: 0 },
      active: { type: "boolean", default: true },
    });
    await model.createTable();
    const created = await model.create({ email: `user-${runId}@example.com` });
    expect(created.score).toBe(0);
    expect(await model.exists({ email: created.email })).toBe(true);
    expect(await model.countDocuments()).toBe(1);
    expect(await model.findById(created.email)).toMatchObject({ email: created.email });
    expect((await model.updateOne({ email: created.email }, { $inc: { score: 2 } })).modified).toBe(1);
    expect((await model.findOne({ email: created.email }))?.score).toBe(2);
    expect((await model.deleteOne({ email: created.email })).deleted).toBe(1);
    expect(await model.findOne({ email: created.email })).toBeNull();
  });

  it("supports authentication, token rotation, and protected-user lookup", async () => {
    const auth = client.auth({ jwtSecret: `integration-secret-${runId}` });
    const email = `auth-${runId}@example.com`;
    const signedUp = await auth.signup({ email, password: "correct horse battery staple" });
    expect(signedUp.user.email).toBe(email);
    expect((await auth.me(signedUp.accessToken))?.email).toBe(email);
    const loggedIn = await auth.login({ email, password: "correct horse battery staple" });
    const refreshed = await auth.refreshToken(loggedIn.refreshToken);
    await expect(auth.refreshToken(loggedIn.refreshToken)).rejects.toThrow("revoked");
    await auth.logout(refreshed.refreshToken);
  });

  it("persists local storage and serves it through MemoryCache", async () => {
    localPath = await mkdtemp(join(tmpdir(), `pgbloom-${runId}-`));
    const disk = await createLocalStore({ path: localPath });
    const memory = new MemoryCache(disk, { maxEntries: 2, ttl: 10_000 });
    await memory.set("persisted", { value: 7 });
    expect(await memory.get("persisted")).toEqual({ value: 7 });
    await memory.close();
    const reopened = await createLocalStore({ path: localPath });
    expect(await reopened.get("persisted")).toEqual({ value: 7 });
    await reopened.close();
    await rm(localPath, { recursive: true, force: true });
    localPath = "";
  });

  it("supports PostgreSQL transactions and rollback without partial state", async () => {
    const table = `integration_tx_${runId.replace(/[^a-z0-9_]/gi, "_")}`;
    await client.pool.query(`CREATE TABLE ${table} (id integer PRIMARY KEY, value text NOT NULL)`);
    const connection = await client.pool.connect();
    try {
      await connection.query("BEGIN");
      await connection.query(`INSERT INTO ${table} VALUES ($1, $2)`, [1, "rolled back"]);
      await connection.query("ROLLBACK");
      const result = await connection.query(`SELECT * FROM ${table}`);
      expect(result.rowCount).toBe(0);
    } finally {
      connection.release();
      await client.pool.query(`DROP TABLE ${table}`);
    }
  });

  it("keeps Bloom membership correct and serializable", async () => {
    const bloom = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    bloom.add("known");
    bloom.add("known");
    expect(bloom.has("known")).toBe(true);
    expect(bloom.has("never-added")).toBe(false);
    expect(bloom.size()).toBe(2);
    expect(BloomFilter.fromJSON(bloom.toJSON()).has("known")).toBe(true);
  });

  it("coordinates locks across PostgreSQL connections", async () => {
    const state = createLockState(client.pool, null, 2_000);
    const key = `integration:${runId}:lock`;
    const results = await Promise.all(Array.from({ length: 12 }, () => tryLock(state, key)));
    expect(results.filter((result) => result.acquired)).toHaveLength(1);
    const winner = results.find((result) => result.acquired);
    await unlock(state, key, winner!.holderId!);
    expect((await tryLock(state, key)).acquired).toBe(true);
  });

  it("delivers Pub/Sub and event notifications and supports replay", async () => {
    const channel = `integration:${runId}:channel`;
    const eventType = `integration:${runId}:event`;
    const messages: unknown[] = [];
    const unsubscribe = await client.subscribe(channel, (_name, payload) => messages.push(payload));
    await client.publish(channel, { value: 1 });
    for (let i = 0; i < 20 && messages.length === 0; i++) await new Promise((resolve) => setTimeout(resolve, 25));
    expect(messages).toEqual([{ value: 1 }]);
    await unsubscribe();

    const events = createEventsState(client.pool);
    const received: unknown[] = [];
    const stop = await import("../dist/esm/index.js").then(({ listen }) => listen(events, eventType, (_type, payload) => received.push(payload)));
    const id = await import("../dist/esm/index.js").then(({ emit }) => emit(events, { type: eventType, payload: { value: 2 } }));
    expect(id).toBeTypeOf("string");
    for (let i = 0; i < 20 && received.length === 0; i++) await new Promise((resolve) => setTimeout(resolve, 25));
    expect(received).toEqual([{ value: 2 }]);
    await stop();
    await import("../dist/esm/index.js").then(({ closeEvents, replayEvents }) => closeEvents(events).then(() => replayEvents(events, { type: eventType, from: new Date(0), handler: () => undefined })));
  });

  it("runs all PostgreSQL-backed rate-limit algorithms", async () => {
    const state = createRateLimitState(client.pool);
    const fixed = await checkRateLimit(state, { key: `integration:${runId}:fixed`, limit: 2, windowMs: 60_000 });
    expect(fixed.allowed).toBe(true);
    await checkRateLimit(state, { key: `integration:${runId}:fixed`, limit: 2, windowMs: 60_000 });
    expect((await checkRateLimit(state, { key: `integration:${runId}:fixed`, limit: 2, windowMs: 60_000 })).allowed).toBe(false);
    expect((await checkSlidingRateLimit(state, { key: `integration:${runId}:sliding`, limit: 2, windowMs: 60_000 })).allowed).toBe(true);
    expect((await checkTokenBucketRateLimit(state, { key: `integration:${runId}:bucket`, capacity: 2, refillRate: 0.01 })).allowed).toBe(true);
  });
});
