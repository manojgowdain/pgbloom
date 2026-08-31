/**
 * Queue integration tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, skip } from "vitest";
import { createPGSnap } from "pgsnap";

const SKIP_INTEGRATION = !process.env.DATABASE_URL;

describe("Queue Integration", () => {
  let pgsnap: Awaited<ReturnType<typeof createPGSnap>>;

  beforeAll(async () => {
    if (SKIP_INTEGRATION) return;
    pgsnap = await createPGSnap(process.env.DATABASE_URL!, {
      cleanupInterval: false,
    });
  });

  afterAll(async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap?.close();
  });

  beforeEach(async () => {
    if (SKIP_INTEGRATION) return;
    // Clean up test queue
    const pool = (pgsnap as any).pool; // internal access for cleanup
    await pool.query(`DELETE FROM pgsnap_queue WHERE queue_name = 'test-queue'`);
  });

  it("should enqueue and dequeue a job", async () => {
    if (SKIP_INTEGRATION) return;

    const job = await pgsnap.enqueue("test-queue", { task: "process", id: 1 });
    expect(job.id).toBeGreaterThan(0);
    expect(job.queueName).toBe("test-queue");
    expect(job.payload).toEqual({ task: "process", id: 1 });
    expect(job.status).toBe("pending");

    const dequeued = await pgsnap.dequeue("test-queue");
    expect(dequeued).not.toBeNull();
    expect(dequeued!.id).toBe(job.id);
    expect(dequeued!.payload).toEqual({ task: "process", id: 1 });
    expect(dequeued!.status).toBe("processing");
  });

  it("should complete a job", async () => {
    if (SKIP_INTEGRATION) return;

    const job = await pgsnap.enqueue("test-queue", { data: "test" });
    const dequeued = await pgsnap.dequeue("test-queue");
    expect(dequeued).not.toBeNull();

    await pgsnap.completeJob(dequeued!.id);

    const stats = await pgsnap.getQueueStats("test-queue");
    expect(stats.completed).toBe(1);
    expect(stats.pending).toBe(0);
    expect(stats.processing).toBe(0);
  });

  it("should fail and retry a job", async () => {
    if (SKIP_INTEGRATION) return;

    const job = await pgsnap.enqueue("test-queue", { data: "test" }, { maxAttempts: 3 });
    const dequeued = await pgsnap.dequeue("test-queue");
    expect(dequeued).not.toBeNull();

    await pgsnap.failJob(dequeued!.id, "Something went wrong");

    // Job should be re-queued as pending
    const stats = await pgsnap.getQueueStats("test-queue");
    expect(stats.pending).toBe(1);
    expect(stats.failed).toBe(0);

    // Dequeue again
    const retry = await pgsnap.dequeue("test-queue");
    expect(retry).not.toBeNull();
    expect(retry!.attempts).toBe(2);
  });

  it("should fail permanently after max attempts", async () => {
    if (SKIP_INTEGRATION) return;

    const job = await pgsnap.enqueue("test-queue", { data: "test" }, { maxAttempts: 2 });

    // First attempt
    const d1 = await pgsnap.dequeue("test-queue");
    await pgsnap.failJob(d1!.id, "Error 1");

    // Second attempt
    const d2 = await pgsnap.dequeue("test-queue");
    await pgsnap.failJob(d2!.id, "Error 2");

    // Should be permanently failed
    const stats = await pgsnap.getQueueStats("test-queue");
    expect(stats.failed).toBe(1);
    expect(stats.pending).toBe(0);
  });

  it("should support priority ordering", async () => {
    if (SKIP_INTEGRATION) return;

    await pgsnap.enqueue("test-queue", { priority: "low" }, { priority: 0 });
    await pgsnap.enqueue("test-queue", { priority: "high" }, { priority: 10 });
    await pgsnap.enqueue("test-queue", { priority: "medium" }, { priority: 5 });

    const first = await pgsnap.dequeue("test-queue");
    expect(first!.payload).toEqual({ priority: "high" });

    const second = await pgsnap.dequeue("test-queue");
    expect(second!.payload).toEqual({ priority: "medium" });

    const third = await pgsnap.dequeue("test-queue");
    expect(third!.payload).toEqual({ priority: "low" });
  });

  it("should return null when queue is empty", async () => {
    if (SKIP_INTEGRATION) return;

    const job = await pgsnap.dequeue("empty-queue");
    expect(job).toBeNull();
  });

  it("should get queue stats", async () => {
    if (SKIP_INTEGRATION) return;

    await pgsnap.enqueue("test-queue", { a: 1 });
    await pgsnap.enqueue("test-queue", { a: 2 });

    const stats = await pgsnap.getQueueStats("test-queue");
    expect(stats.pending).toBe(2);

    const dequeued = await pgsnap.dequeue("test-queue");
    await pgsnap.completeJob(dequeued!.id);

    const stats2 = await pgsnap.getQueueStats("test-queue");
    expect(stats2.pending).toBe(1);
    expect(stats2.completed).toBe(1);
  });

  it("should cleanup old completed jobs", async () => {
    if (SKIP_INTEGRATION) return;

    const job = await pgsnap.enqueue("test-queue", { data: "old" });
    const dequeued = await pgsnap.dequeue("test-queue");
    await pgsnap.completeJob(dequeued!.id);

    // Manually set completed_at to old date
    const pool = (pgsnap as any).pool;
    await pool.query(
      `UPDATE pgsnap_queue SET completed_at = $1 WHERE id = $2`,
      [new Date(Date.now() - 25 * 60 * 60 * 1000), job.id],
    );

    const deleted = await pgsnap.cleanupJobs("test-queue", new Date(Date.now() - 24 * 60 * 60 * 1000));
    expect(deleted).toBe(1);
  });
});