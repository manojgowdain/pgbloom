/**
 * PostgreSQL queries for counter operations.
 */
/**
 * Atomically increments a counter by the specified delta.
 * Creates the counter if it doesn't exist.
 * Returns the new value.
 */
export async function incrementCounter(pool, key, delta) {
    const result = await pool.query(`INSERT INTO pgbloom_counters (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = pgbloom_counters.value + $2,
       updated_at = NOW()
     RETURNING value`, [key, delta]);
    return parseInt(result.rows[0].value, 10);
}
/**
 * Gets the current value of a counter.
 * Returns null if the counter doesn't exist.
 */
export async function getCounter(pool, key) {
    const result = await pool.query(`SELECT value FROM pgbloom_counters WHERE key = $1`, [key]);
    if (result.rowCount === 0) {
        return null;
    }
    return parseInt(result.rows[0].value, 10);
}
/**
 * Sets a counter to a specific value.
 * Creates the counter if it doesn't exist.
 * Returns the new value.
 */
export async function setCounter(pool, key, value) {
    const result = await pool.query(`INSERT INTO pgbloom_counters (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = $2,
       updated_at = NOW()
     RETURNING value`, [key, value]);
    return parseInt(result.rows[0].value, 10);
}
/**
 * Deletes a counter.
 * Returns true if the counter was deleted, false if it didn't exist.
 */
export async function deleteCounter(pool, key) {
    const result = await pool.query(`DELETE FROM pgbloom_counters WHERE key = $1 RETURNING key`, [key]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Gets all counters with their values.
 */
export async function listCounters(pool) {
    const result = await pool.query(`SELECT key, value, updated_at FROM pgbloom_counters ORDER BY key`);
    return result.rows.map((row) => ({
        key: row.key,
        value: parseInt(row.value, 10),
        updatedAt: new Date(row.updated_at),
    }));
}
//# sourceMappingURL=queries.js.map