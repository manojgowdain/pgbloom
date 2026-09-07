/**
 * PostgreSQL connection pool management.
 */
import pg from "pg";
const { Pool } = pg;
/**
 * Creates and returns a new pg Pool instance.
 */
export function createPool(options) {
    return new Pool({
        connectionString: options.connectionString,
        max: options.max ?? 10,
        idleTimeoutMillis: options.idleTimeoutMillis ?? 30000,
        connectionTimeoutMillis: options.connectionTimeoutMillis ?? 2000,
    });
}
/**
 * Tests the connection by running a simple query.
 */
export async function testConnection(pool) {
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=pool.js.map