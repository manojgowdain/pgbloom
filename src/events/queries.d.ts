/**
 * PostgreSQL queries for events operations.
 */
import { Pool } from "pg";
import { EventHistoryOptions } from "./types.js";
/**
 * Inserts an event into the pgbloom_events table and sends a NOTIFY.
 */
export declare function insertEvent(pool: Pool, eventId: string, type: string, payload: unknown, metadata?: Record<string, unknown>): Promise<void>;
/**
 * Gets event history with filtering and pagination.
 */
export declare function getEventHistory(pool: Pool, options?: EventHistoryOptions): Promise<{
    events: any[];
    nextCursor?: string;
}>;
/**
 * Gets a single event by its event_id.
 */
export declare function getEventById(pool: Pool, eventId: string): Promise<any | null>;
//# sourceMappingURL=queries.d.ts.map