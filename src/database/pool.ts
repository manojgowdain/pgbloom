/**
 * PostgreSQL connection pool management.
 */

import pg from "pg";

const { Pool } = pg;

export interface PoolOptions {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Creates and returns a new pg Pool instance.
 */
export function createPool(options: PoolOptions): pg.Pool {
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
export async function testConnection(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}