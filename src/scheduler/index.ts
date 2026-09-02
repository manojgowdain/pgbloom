import { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  createSchedule,
  getDueJobs,
  claimJob,
  completeJob,
  failJob,
  cancelJob,
  getSchedule,
  listSchedules,
} from "./queries.js";
import type {
  SchedulerState,
  ScheduleOptions,
  ScheduledJob,
  ScheduleResult,
  SchedulerWorkerOptions,
} from "./types.js";
import type { LocalStore } from "../storage/local/types.js";

// Re-export types for external use
export type {
  SchedulerState,
  ScheduleOptions,
  ScheduledJob,
  ScheduleResult,
  SchedulerWorkerOptions,
};

/**
 * Creates a new scheduler state with the database connection pool
 * and optional local store for caching.
 */
export function createSchedulerState(
  pool: Pool,
  localStore: LocalStore | null = null,
  workerId?: string
): SchedulerState {
  return {
    pool,
    localStore,
    workerId: workerId ?? randomUUID(),
  };
}

/**
 * Schedules a one-time job to run at a specific time.
 */
export async function schedule(
  state: SchedulerState,
  options: ScheduleOptions
): Promise<ScheduleResult> {
  const result = await createSchedule(state.pool, {
    name: options.name,
    payload: options.payload,
    runAt: options.runAt,
    priority: options.priority,
    maxAttempts: options.maxAttempts,
    // interval is intentionally omitted for one-time jobs
  });

  const job = await getSchedule(state.pool, result.id);
  if (!job) {
    throw new Error("Failed to retrieve scheduled job after creation");
  }

  return { job: mapToScheduledJob(job) };
}

/**
 * Schedules a recurring job based on an interval expression.
 */
export async function scheduleRecurring(
  state: SchedulerState,
  options: ScheduleOptions & { interval: string }
): Promise<ScheduleResult> {
  if (!options.interval) {
    throw new Error("Interval is required for recurring jobs");
  }

  const result = await createSchedule(state.pool, {
    name: options.name,
    payload: options.payload,
    runAt: options.runAt,
    priority: options.priority,
    maxAttempts: options.maxAttempts,
    interval: options.interval,
  });

  const job = await getSchedule(state.pool, result.id);
  if (!job) {
    throw new Error("Failed to retrieve scheduled job after creation");
  }

  return { job: mapToScheduledJob(job) };
}

/**
 * Cancels a scheduled job.
 */
export async function cancelSchedule(
  state: SchedulerState,
  jobId: number
): Promise<void> {
  await cancelJob(state.pool, jobId);
}

/**
 * Gets job details by ID.
 */
export async function getScheduleJob(
  state: SchedulerState,
  jobId: number
): Promise<ScheduledJob | null> {
  const job = await getSchedule(state.pool, jobId);
  if (!job) {
    return null;
  }
  return mapToScheduledJob(job);
}

/**
 * Lists schedules with optional filtering.
 */
export async function listScheduledJobs(
  state: SchedulerState,
  filter: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ScheduledJob[]> {
  const jobs = await listSchedules(state.pool, filter);
  return jobs.map(mapToScheduledJob);
}

/**
 * Gets jobs that are due to run and claims them for processing.
 * Uses FOR UPDATE SKIP LOCKED for safe concurrent processing.
 */
export async function getAndClaimDueJobs(
  state: SchedulerState,
  limit: number = 10
): Promise<ScheduledJob[]> {
  const jobs = await getDueJobs(state.pool, state.workerId, limit);
  return jobs.map(mapToScheduledJob);
}

/**
 * Claims a specific job for processing by this worker.
 */
export async function claimScheduledJob(
  state: SchedulerState,
  jobId: number
): Promise<ScheduledJob | null> {
  const acquired = await claimJob(state.pool, jobId, state.workerId);
  if (!acquired) {
    return null;
  }
  return getScheduleJob(state, jobId);
}

/**
 * Marks a job as completed successfully.
 * For recurring jobs, this will schedule the next run.
 */
export async function completeScheduledJob(
  state: SchedulerState,
  jobId: number
): Promise<{ nextRunScheduled: boolean; nextRunAt: Date | null }> {
  // First get the job to check if it's recurring
  const job = await getSchedule(state.pool, jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  const isRecurring = !!job.interval;

  if (isRecurring && job.interval) {
    // For recurring jobs, calculate next run and update
    const nextRunAt = calculateNextRun(job.runAt, job.interval);
    await state.pool.query(
      `UPDATE pgbloom_schedules
       SET status = 'scheduled',
           last_run_at = NOW(),
           run_at = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [nextRunAt, jobId]
    );
    return { nextRunScheduled: true, nextRunAt };
  } else {
    // For one-time jobs, mark as completed
    await completeJob(state.pool, jobId);
    return { nextRunScheduled: false, nextRunAt: null };
  }
}

/**
 * Marks a job as failed. If attempts < maxAttempts, schedules a retry.
 * For recurring jobs, uses the interval to determine next run.
 */
export async function failScheduledJob(
  state: SchedulerState,
  jobId: number,
  error: string
): Promise<{ shouldRetry: boolean; nextRunAt: Date | null }> {
  const result = await failJob(state.pool, jobId, error);
  return result;
}

/**
 * Maps a database row to a ScheduledJob object.
 */
function mapToScheduledJob(job: {
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
}): ScheduledJob {
  return {
    id: job.id,
    name: job.name,
    payload: job.payload,
    runAt: job.runAt,
    priority: job.priority,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    status: job.status as ScheduledJob['status'],
    interval: job.interval ?? undefined,
    lastRunAt: job.lastRunAt ?? undefined,
    nextRunAt: job.nextRunAt ?? undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
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