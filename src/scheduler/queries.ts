import { Pool } from "pg";
import { serialize } from "../utils/serialize.js";
import { deserialize } from "../utils/deserialize.js";

/**
 * Creates a new scheduled job.
 */
export async function createSchedule(
  pool: Pool,
  options: {
    name: string;
    payload: unknown;
    runAt: Date;
    priority?: number;
    maxAttempts?: number;
    interval?: string;
  }
): Promise<{ id: number }> {
  const priority = options.priority ?? 0;
  const maxAttempts = options.maxAttempts ?? 3;
  const serializedPayload = serialize(options.payload);

  const result = await pool.query(
    `INSERT INTO pgbloom_schedules
     (name, payload, run_at, priority, max_attempts, interval)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      options.name,
      serializedPayload,
      options.runAt,
      priority,
      maxAttempts,
      options.interval ?? null
    ]
  );

  return { id: Number(result.rows[0].id) };
}

/**
 * Gets jobs that are due to run (using FOR UPDATE SKIP LOCKED for safe concurrent processing).
 */
export async function getDueJobs(
  pool: Pool,
  workerId: string,
  limit: number = 10
): Promise<Array<{
  id: number;
  name: string;
  payload: unknown;
  runAt: Date;
  priority: number;
  attempts: number;
  maxAttempts: number;
  status: string;
  interval: string | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const result = await pool.query(
    `UPDATE pgbloom_schedules
     SET status = 'processing',
         attempts = attempts + 1,
         updated_at = NOW()
     WHERE id = (
       SELECT id FROM pgbloom_schedules
       WHERE status = 'scheduled'
         AND run_at <= NOW()
       ORDER BY priority DESC, run_at ASC, id ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $2
     )
     RETURNING *`,
    [workerId, limit]
  );

  return result.rows.map(mapRowToScheduledJob);
}

/**
 * Claims a specific job for processing by a worker.
 */
export async function claimJob(
  pool: Pool,
  jobId: number,
  workerId: string
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE pgbloom_schedules
     SET status = 'processing',
         attempts = attempts + 1,
         updated_at = NOW()
     WHERE id = $1
       AND status = 'scheduled'
       AND run_at <= NOW()
     RETURNING id`,
    [jobId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Marks a job as completed successfully.
 */
export async function completeJob(
  pool: Pool,
  jobId: number
): Promise<void> {
  await pool.query(
    `UPDATE pgbloom_schedules
     SET status = 'completed',
         updated_at = NOW()
     WHERE id = $1`,
    [jobId]
  );
}

/**
 * Marks a job as failed, schedule retry if attempts < maxAttempts.
 * For recurring jobs with interval, reschedules based on interval.
 */
export async function failJob(
  pool: Pool,
  jobId: number,
  error: string
): Promise<{ shouldRetry: boolean; nextRunAt: Date | null }> {
  // First get the current job details
  const jobResult = await pool.query(
    `SELECT attempts, max_attempts, interval, run_at
     FROM pgbloom_schedules
     WHERE id = $1`,
    [jobId]
  );

  if (jobResult.rowCount === 0) {
    return { shouldRetry: false, nextRunAt: null };
  }

  const job = jobResult.rows[0];
  const attempts = Number(job.attempts);
  const maxAttempts = Number(job.max_attempts);
  const interval = job.interval as string | null;
  const originalRunAt = job.run_at as Date;

  let nextRunAt: Date | null = null;
  let shouldRetry = false;

  if (attempts < maxAttempts) {
    // Calculate next run time based on interval or exponential backoff
    if (interval) {
      // For recurring jobs, we'd need to parse the cron expression
      // For now, we'll implement a simple interval parser
      nextRunAt = calculateNextRun(originalRunAt, interval);
      shouldRetry = true;
    } else {
      // For one-time jobs with retries, use exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, attempts), 300000); // Max 5 minutes
      nextRunAt = new Date(Date.now() + delayMs);
      shouldRetry = true;
    }
  }

  // Update the job status
  await pool.query(
    `UPDATE pgbloom_schedules
     SET status = $1,
         attempts = attempts + 1,
         run_at = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [
      shouldRetry ? 'scheduled' : 'failed',
      nextRunAt,
      jobId
    ]
  );

  return { shouldRetry, nextRunAt };
}

/**
 * Cancels a scheduled job.
 */
export async function cancelJob(
  pool: Pool,
  jobId: number
): Promise<void> {
  await pool.query(
    `UPDATE pgbloom_schedules
     SET status = 'cancelled',
         updated_at = NOW()
     WHERE id = $1`,
    [jobId]
  );
}

/**
 * Gets job details by ID.
 */
export async function getSchedule(
  pool: Pool,
  jobId: number
): Promise<{
  id: number;
  name: string;
  payload: unknown;
  runAt: Date;
  priority: number;
  attempts: number;
  maxAttempts: number;
  status: string;
  interval: string | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const result = await pool.query(
    `SELECT * FROM pgbloom_schedules WHERE id = $1`,
    [jobId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRowToScheduledJob(result.rows[0]);
}

/**
 * Lists schedules with optional filtering.
 */
export async function listSchedules(
  pool: Pool,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<Array<{
  id: number;
  name: string;
  payload: unknown;
  runAt: Date;
  priority: number;
  attempts: number;
  maxAttempts: number;
  status: string;
  interval: string | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>> {
  const status = options.status;
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  let query = `SELECT * FROM pgbloom_schedules`;
  const params: any[] = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    query += ` WHERE status = $${paramCount}`;
    params.push(status);
  }

  query += ` ORDER BY priority DESC, run_at ASC, id ASC
             LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows.map(mapRowToScheduledJob);
}

/**
 * Maps a database row to a ScheduledJob object.
 */
function mapRowToScheduledJob(row: Record<string, unknown>): {
  id: number;
  name: string;
  payload: unknown;
  runAt: Date;
  priority: number;
  attempts: number;
  maxAttempts: number;
  status: string;
  interval: string | null;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: Number(row.id),
    name: row.name as string,
    payload: typeof row.payload === "string" ? deserialize(row.payload) : row.payload,
    runAt: new Date(row.run_at as string),
    priority: Number(row.priority),
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    status: row.status as string,
    interval: (row.interval as string) ?? null,
    lastRunAt: row.last_run_at ? new Date(row.last_run_at as string) : null,
    nextRunAt: row.next_run_at ? new Date(row.next_run_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string)
  };
}

/**
 * Calculates the next run time based on a simple interval expression.
 * Supports basic formats like: "5s", "10m", "1h", "1d"
 * For more complex cron expressions, a proper cron library would be needed.
 */
function calculateNextRun(baseDate: Date, interval: string): Date {
  const num = parseInt(interval.slice(0, -1));
  const unit = interval.slice(-1).toLowerCase();

  let ms = 0;
  switch (unit) {
    case 's':
      ms = num * 1000;
      break;
    case 'm':
      ms = num * 60 * 1000;
      break;
    case 'h':
      ms = num * 60 * 60 * 1000;
      break;
    case 'd':
      ms = num * 24 * 60 * 60 * 1000;
      break;
    default:
      // Default to 1 minute if unrecognized format
      ms = 60 * 1000;
  }

  return new Date(baseDate.getTime() + ms);
}