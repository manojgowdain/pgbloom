/**
 * Queue module with reliable job processing using FOR UPDATE SKIP LOCKED.
 */

import { Pool } from "pg";

export interface QueueJob<T = unknown> {
  id: number;
  queueName: string;
  payload: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  visibilityTimeout: number;
  createdAt: Date;
  availableAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  error: string | null;
}

export interface QueueOptions {
  /**
   * Default visibility timeout in milliseconds. When a worker claims a job,
   * it becomes invisible to other workers for this duration.
   *
   * @default 30000 (30 seconds)
   */
  visibilityTimeout?: number;

  /**
   * Default maximum number of attempts for a job.
   *
   * @default 3
   */
  maxAttempts?: number;
}

export interface QueueState {
  pool: Pool;
  defaultOptions: Required<QueueOptions>;
}

export function createQueueState(pool: Pool, options: QueueOptions = {}): QueueState {
  return {
    pool,
    defaultOptions: {
      visibilityTimeout: options.visibilityTimeout ?? 30000,
      maxAttempts: options.maxAttempts ?? 3,
    },
  };
}

/**
 * Enqueues a job.
 */
export async function enqueue<T>(
  state: QueueState,
  queueName: string,
  payload: T,
  options: {
    priority?: number;
    maxAttempts?: number;
    visibilityTimeout?: number;
  } = {},
): Promise<QueueJob<T>> {
  const priority = options.priority ?? 0;
  const maxAttempts = options.maxAttempts ?? state.defaultOptions.maxAttempts;
  const visibilityTimeout = options.visibilityTimeout ?? state.defaultOptions.visibilityTimeout;

  const result = await state.pool.query(
    `INSERT INTO pgsnap_queue (queue_name, payload, priority, max_attempts, visibility_timeout)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [queueName, JSON.stringify(payload), priority, maxAttempts, visibilityTimeout],
  );

  const row = result.rows[0];
  return mapRowToJob(row);
}

/**
 * Claims the next available job for processing.
 * Uses FOR UPDATE SKIP LOCKED for reliable concurrent processing.
 */
export async function dequeue<T>(
  state: QueueState,
  queueName: string,
): Promise<QueueJob<T> | null> {
  const result = await state.pool.query(
    `UPDATE pgsnap_queue
     SET status = 'processing',
         attempts = attempts + 1,
         started_at = NOW(),
         available_at = NOW() + COALESCE(visibility_timeout, 30000) * INTERVAL '1 millisecond'
     WHERE id = (
       SELECT id FROM pgsnap_queue
       WHERE queue_name = $1
         AND status = 'pending'
         AND available_at <= NOW()
       ORDER BY priority DESC, created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`,
    [queueName],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRowToJob(result.rows[0]);
}

/**
 * Marks a job as completed successfully.
 */
export async function completeJob(
  state: QueueState,
  jobId: number,
): Promise<void> {
  await state.pool.query(
    `UPDATE pgsnap_queue
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1`,
    [jobId],
  );
}

/**
 * Marks a job as failed. If attempts < maxAttempts, re-queues it.
 */
export async function failJob(
  state: QueueState,
  jobId: number,
  error: string,
): Promise<void> {
  await state.pool.query(
    `UPDATE pgsnap_queue
     SET status = CASE
                    WHEN attempts >= max_attempts THEN 'failed'
                    ELSE 'pending'
                  END,
         failed_at = CASE WHEN attempts >= max_attempts THEN NOW() END,
         error = $2,
         available_at = CASE
                          WHEN attempts < max_attempts THEN NOW() + visibility_timeout * INTERVAL '1 millisecond'
                        END
     WHERE id = $1`,
    [jobId, error],
  );
}

/**
 * Returns job statistics for a queue.
 */
export async function getQueueStats(
  state: QueueState,
  queueName: string,
): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const result = await state.pool.query(
    `SELECT status, count(*) as count
     FROM pgsnap_queue
     WHERE queue_name = $1
     GROUP BY status`,
    [queueName],
  );

  const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
  for (const row of result.rows) {
    if (row.status in stats) {
      stats[row.status as keyof typeof stats] = parseInt(row.count, 10);
    }
  }
  return stats;
}

/**
 * Cleans up old completed/failed jobs.
 */
export async function cleanupJobs(
  state: QueueState,
  queueName: string,
  olderThan: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
): Promise<number> {
  const result = await state.pool.query(
    `DELETE FROM pgsnap_queue
     WHERE queue_name = $1
       AND status IN ('completed', 'failed')
       AND completed_at < $2`,
    [queueName, olderThan],
  );
  return result.rowCount ?? 0;
}

function mapRowToJob<T>(row: Record<string, unknown>): QueueJob<T> {
  return {
    id: Number(row.id),
    queueName: row.queue_name as string,
    payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
    priority: Number(row.priority),
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    visibilityTimeout: Number(row.visibility_timeout),
    createdAt: new Date(row.created_at as string),
    availableAt: new Date(row.available_at as string),
    startedAt: row.started_at ? new Date(row.started_at as string) : null,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    failedAt: row.failed_at ? new Date(row.failed_at as string) : null,
    error: (row.error as string) ?? null,
  };
}