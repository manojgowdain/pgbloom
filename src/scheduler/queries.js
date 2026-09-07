import { serialize } from "../utils/serialize.js";
import { deserialize } from "../utils/deserialize.js";
/**
 * Creates a new scheduled job.
 */
export async function createSchedule(pool, options) {
    const priority = options.priority ?? 0;
    const maxAttempts = options.maxAttempts ?? 3;
    const serializedPayload = serialize(options.payload);
    const result = await pool.query(`INSERT INTO pgbloom_schedules
     (name, payload, run_at, priority, max_attempts, interval)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`, [
        options.name,
        serializedPayload,
        options.runAt,
        priority,
        maxAttempts,
        options.interval ?? null
    ]);
    return { id: Number(result.rows[0].id) };
}
/**
 * Gets jobs that are due to run (using FOR UPDATE SKIP LOCKED for safe concurrent processing).
 */
export async function getDueJobs(pool, workerId, limit = 10) {
    const result = await pool.query(`UPDATE pgbloom_schedules
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
     RETURNING *`, [workerId, limit]);
    return result.rows.map(mapRowToScheduledJob);
}
/**
 * Claims a specific job for processing by a worker.
 */
export async function claimJob(pool, jobId, workerId) {
    const result = await pool.query(`UPDATE pgbloom_schedules
     SET status = 'processing',
         attempts = attempts + 1,
         updated_at = NOW()
     WHERE id = $1
       AND status = 'scheduled'
       AND run_at <= NOW()
     RETURNING id`, [jobId]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Marks a job as completed successfully.
 */
export async function completeJob(pool, jobId) {
    await pool.query(`UPDATE pgbloom_schedules
     SET status = 'completed',
         updated_at = NOW()
     WHERE id = $1`, [jobId]);
}
/**
 * Marks a job as failed, schedule retry if attempts < maxAttempts.
 * For recurring jobs with interval, reschedules based on interval.
 */
export async function failJob(pool, jobId, error) {
    // First get the current job details
    const jobResult = await pool.query(`SELECT attempts, max_attempts, interval, run_at
     FROM pgbloom_schedules
     WHERE id = $1`, [jobId]);
    if (jobResult.rowCount === 0) {
        return { shouldRetry: false, nextRunAt: null };
    }
    const job = jobResult.rows[0];
    const attempts = Number(job.attempts);
    const maxAttempts = Number(job.max_attempts);
    const interval = job.interval;
    const originalRunAt = job.run_at;
    let nextRunAt = null;
    let shouldRetry = false;
    if (attempts < maxAttempts) {
        // Calculate next run time based on interval or exponential backoff
        if (interval) {
            // For recurring jobs, we'd need to parse the cron expression
            // For now, we'll implement a simple interval parser
            nextRunAt = calculateNextRun(originalRunAt, interval);
            shouldRetry = true;
        }
        else {
            // For one-time jobs with retries, use exponential backoff
            const delayMs = Math.min(1000 * Math.pow(2, attempts), 300000); // Max 5 minutes
            nextRunAt = new Date(Date.now() + delayMs);
            shouldRetry = true;
        }
    }
    // Update the job status
    await pool.query(`UPDATE pgbloom_schedules
     SET status = $1,
         attempts = attempts + 1,
         run_at = $2,
         updated_at = NOW()
     WHERE id = $3`, [
        shouldRetry ? 'scheduled' : 'failed',
        nextRunAt,
        jobId
    ]);
    return { shouldRetry, nextRunAt };
}
/**
 * Cancels a scheduled job.
 */
export async function cancelJob(pool, jobId) {
    await pool.query(`UPDATE pgbloom_schedules
     SET status = 'cancelled',
         updated_at = NOW()
     WHERE id = $1`, [jobId]);
}
/**
 * Gets job details by ID.
 */
export async function getSchedule(pool, jobId) {
    const result = await pool.query(`SELECT * FROM pgbloom_schedules WHERE id = $1`, [jobId]);
    if (result.rowCount === 0) {
        return null;
    }
    return mapRowToScheduledJob(result.rows[0]);
}
/**
 * Lists schedules with optional filtering.
 */
export async function listSchedules(pool, options = {}) {
    const status = options.status;
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    let query = `SELECT * FROM pgbloom_schedules`;
    const params = [];
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
function mapRowToScheduledJob(row) {
    return {
        id: Number(row.id),
        name: row.name,
        payload: typeof row.payload === "string" ? deserialize(row.payload) : row.payload,
        runAt: new Date(row.run_at),
        priority: Number(row.priority),
        attempts: Number(row.attempts),
        maxAttempts: Number(row.max_attempts),
        status: row.status,
        interval: row.interval ?? null,
        lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
        nextRunAt: row.next_run_at ? new Date(row.next_run_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
/**
 * Calculates the next run time based on a simple interval expression.
 * Supports basic formats like: "5s", "10m", "1h", "1d"
 * For more complex cron expressions, a proper cron library would be needed.
 */
function calculateNextRun(baseDate, interval) {
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
//# sourceMappingURL=queries.js.map