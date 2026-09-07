import { Pool } from "pg";
import type { SchedulerState, ScheduleOptions, ScheduledJob, ScheduleResult, SchedulerWorkerOptions } from "./types.js";
import type { LocalStore } from "../storage/local/types.js";
export type { SchedulerState, ScheduleOptions, ScheduledJob, ScheduleResult, SchedulerWorkerOptions, };
/**
 * Creates a new scheduler state with the database connection pool
 * and optional local store for caching.
 */
export declare function createSchedulerState(pool: Pool, localStore?: LocalStore | null, workerId?: string): SchedulerState;
/**
 * Schedules a one-time job to run at a specific time.
 */
export declare function schedule(state: SchedulerState, options: ScheduleOptions): Promise<ScheduleResult>;
/**
 * Schedules a recurring job based on an interval expression.
 */
export declare function scheduleRecurring(state: SchedulerState, options: ScheduleOptions & {
    interval: string;
}): Promise<ScheduleResult>;
/**
 * Cancels a scheduled job.
 */
export declare function cancelSchedule(state: SchedulerState, jobId: number): Promise<void>;
/**
 * Gets job details by ID.
 */
export declare function getScheduleJob(state: SchedulerState, jobId: number): Promise<ScheduledJob | null>;
/**
 * Lists schedules with optional filtering.
 */
export declare function listScheduledJobs(state: SchedulerState, filter?: {
    status?: string;
    limit?: number;
    offset?: number;
}): Promise<ScheduledJob[]>;
/**
 * Gets jobs that are due to run and claims them for processing.
 * Uses FOR UPDATE SKIP LOCKED for safe concurrent processing.
 */
export declare function getAndClaimDueJobs(state: SchedulerState, limit?: number): Promise<ScheduledJob[]>;
/**
 * Claims a specific job for processing by this worker.
 */
export declare function claimScheduledJob(state: SchedulerState, jobId: number): Promise<ScheduledJob | null>;
/**
 * Marks a job as completed successfully.
 * For recurring jobs, this will schedule the next run.
 */
export declare function completeScheduledJob(state: SchedulerState, jobId: number): Promise<{
    nextRunScheduled: boolean;
    nextRunAt: Date | null;
}>;
/**
 * Marks a job as failed. If attempts < maxAttempts, schedules a retry.
 * For recurring jobs, uses the interval to determine next run.
 */
export declare function failScheduledJob(state: SchedulerState, jobId: number, error: string): Promise<{
    shouldRetry: boolean;
    nextRunAt: Date | null;
}>;
//# sourceMappingURL=index.d.ts.map