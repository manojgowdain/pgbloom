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
export declare function createQueueState(pool: Pool, options?: QueueOptions): QueueState;
/**
 * Enqueues a job.
 */
export declare function enqueue<T>(state: QueueState, queueName: string, payload: T, options?: {
    priority?: number;
    maxAttempts?: number;
    visibilityTimeout?: number;
}): Promise<QueueJob<T>>;
/**
 * Claims the next available job for processing.
 * Uses FOR UPDATE SKIP LOCKED for reliable concurrent processing.
 */
export declare function dequeue<T>(state: QueueState, queueName: string): Promise<QueueJob<T> | null>;
/**
 * Marks a job as completed successfully.
 */
export declare function completeJob(state: QueueState, jobId: number): Promise<void>;
/**
 * Marks a job as failed. If attempts < maxAttempts, re-queues it.
 */
export declare function failJob(state: QueueState, jobId: number, error: string): Promise<void>;
/**
 * Returns job statistics for a queue.
 */
export declare function getQueueStats(state: QueueState, queueName: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
}>;
/**
 * Cleans up old completed/failed jobs.
 */
export declare function cleanupJobs(state: QueueState, queueName: string, olderThan?: Date): Promise<number>;
//# sourceMappingURL=index.d.ts.map