/**
 * Main pgbloom client.
 *
 * Provides cache, pub/sub, and queue functionality backed by PostgreSQL.
 * Includes optional internal Bloom Filter for cache optimization.
 */
import { BloomFilter } from "../bloom/index.js";
import { type MessageHandler } from "../pubsub/index.js";
import { type QueueJob } from "../queue/index.js";
import type { CacheExpiry } from "../types/index.js";
import type { PgbloomOptions as PgbloomOptionsType } from "../types/index.js";
import { type Model, type ModelSchema, type ModelOptions } from "../model/index.js";
import type { Auth as AuthType } from "../auth/index.js";
/**
 * Public pgbloom client interface.
 */
export interface PgbloomClient {
    getCache<T = unknown>(key: string): Promise<T | null>;
    setCache<T = unknown>(key: string, value: T, expiry?: CacheExpiry): Promise<T>;
    deleteCache(key: string): Promise<void>;
    clearCache(): Promise<void>;
    clearExpiredCache(): Promise<number>;
    publish(channel: string, payload: unknown): Promise<void>;
    subscribe(channel: string, handler: MessageHandler): Promise<() => void>;
    enqueue<T>(queueName: string, payload: T, options?: {
        priority?: number;
        maxAttempts?: number;
        visibilityTimeout?: number;
    }): Promise<QueueJob<T>>;
    dequeue<T>(queueName: string): Promise<QueueJob<T> | null>;
    completeJob(jobId: number): Promise<void>;
    failJob(jobId: number, error: string): Promise<void>;
    getQueueStats(queueName: string): Promise<{
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    }>;
    cleanupJobs(queueName: string, olderThan?: Date): Promise<number>;
    tryLock(key: string, options?: {
        ttl?: number;
    }): Promise<boolean>;
    lock(key: string, options?: {
        ttl?: number;
        timeout?: number;
    }): Promise<void>;
    unlock(key: string, holderId: string): Promise<void>;
    acquireLeadership(resource: string, options?: {
        ttl?: number;
        onLost?: () => void;
    }): Promise<string | null>;
    releaseLeadership(resource: string, holderId: string): Promise<void>;
    isLeader(resource: string, holderId: string): Promise<boolean>;
    schedule(name: string, payload: unknown, runAt: Date, options?: {
        priority?: number;
        maxAttempts?: number;
        interval?: string;
    }): Promise<{
        id: number;
    }>;
    scheduleRecurring(name: string, payload: unknown, interval: string, options?: {
        priority?: number;
        maxAttempts?: number;
    }): Promise<{
        id: number;
    }>;
    cancelSchedule(jobId: number): Promise<void>;
    getSchedule(jobId: number): Promise<{
        id: number;
        name: string;
        payload: unknown;
        runAt: Date;
        status: string;
    } | null>;
    listSchedules(filter?: {
        status?: string;
        name?: string;
    }): Promise<Array<{
        id: number;
        name: string;
        payload: unknown;
        runAt: Date;
        status: string;
    }>>;
    rateLimit(key: string, limit: number, windowMs: number): Promise<{
        allowed: boolean;
        limit: number;
        remaining: number;
        resetAt: Date;
    }>;
    rateLimitTokenBucket(key: string, capacity: number, refillRate: number): Promise<{
        allowed: boolean;
        limit: number;
        remaining: number;
        resetAt: Date;
    }>;
    emit(type: string, payload: unknown, metadata?: Record<string, unknown>): Promise<string>;
    listen(type: string, handler: (type: string, payload: unknown, meta: any) => void | Promise<void>): Promise<() => void>;
    getEventHistory(options?: {
        type?: string;
        from?: Date;
        to?: Date;
        limit?: number;
        cursor?: string;
    }): Promise<{
        events: any[];
        nextCursor?: string;
    }>;
    replayEvents(from: Date, to: Date | undefined, type: string | undefined, handler: (event: any) => void | Promise<void>): Promise<{
        replayed: number;
    }>;
    increment(key: string, delta?: number): Promise<{
        value: number;
    }>;
    decrement(key: string, delta?: number): Promise<{
        value: number;
    }>;
    add(key: string, delta: number): Promise<{
        value: number;
    }>;
    subtract(key: string, delta: number): Promise<{
        value: number;
    }>;
    getCounter(key: string, options?: {
        consistency?: 'strong' | 'local' | 'eventual';
    }): Promise<{
        value: number;
    }>;
    setCounter(key: string, value: number): Promise<{
        value: number;
    }>;
    removeCounter(key: string): Promise<boolean>;
    model<T = any>(tableName: string, schema?: ModelSchema, options?: ModelOptions): Model<T>;
    auth(options?: any): AuthType;
    bloom(options?: {
        expectedItems?: number;
        falsePositiveRate?: number;
    }): BloomFilter;
    close(): Promise<void>;
}
/**
 * Creates a new pgbloom client.
 *
 * @param connectionString - PostgreSQL connection string (postgres:// or postgresql://)
 * @param options - Configuration options
 */
export declare function createPgbloom(connectionString: string, options?: PgbloomOptionsType): Promise<PgbloomClient>;
/**
 * Default export for convenience: `import pgbloom from "pgbloom"`
 * Usage: `const pgsnap = await pgbloom(connectionString, options)`
 */
export default createPgbloom;
//# sourceMappingURL=PGSnap.d.ts.map