import { Pool } from "pg";
/**
 * Creates a new scheduled job.
 */
export declare function createSchedule(pool: Pool, options: {
    name: string;
    payload: unknown;
    runAt: Date;
    priority?: number;
    maxAttempts?: number;
    interval?: string;
}): Promise<{
    id: number;
}>;
/**
 * Gets jobs that are due to run (using FOR UPDATE SKIP LOCKED for safe concurrent processing).
 */
export declare function getDueJobs(pool: Pool, workerId: string, limit?: number): Promise<Array<{
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
}>>;
/**
 * Claims a specific job for processing by a worker.
 */
export declare function claimJob(pool: Pool, jobId: number, workerId: string): Promise<boolean>;
/**
 * Marks a job as completed successfully.
 */
export declare function completeJob(pool: Pool, jobId: number): Promise<void>;
/**
 * Marks a job as failed, schedule retry if attempts < maxAttempts.
 * For recurring jobs with interval, reschedules based on interval.
 */
export declare function failJob(pool: Pool, jobId: number, error: string): Promise<{
    shouldRetry: boolean;
    nextRunAt: Date | null;
}>;
/**
 * Cancels a scheduled job.
 */
export declare function cancelJob(pool: Pool, jobId: number): Promise<void>;
/**
 * Gets job details by ID.
 */
export declare function getSchedule(pool: Pool, jobId: number): Promise<{
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
} | null>;
/**
 * Lists schedules with optional filtering.
 */
export declare function listSchedules(pool: Pool, options?: {
    status?: string;
    limit?: number;
    offset?: number;
}): Promise<Array<{
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
}>>;
//# sourceMappingURL=queries.d.ts.map