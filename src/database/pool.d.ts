/**
 * PostgreSQL connection pool management.
 */
import pg from "pg";
export interface PoolOptions {
    connectionString: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
/**
 * Creates and returns a new pg Pool instance.
 */
export declare function createPool(options: PoolOptions): pg.Pool;
/**
 * Tests the connection by running a simple query.
 */
export declare function testConnection(pool: pg.Pool): Promise<void>;
//# sourceMappingURL=pool.d.ts.map