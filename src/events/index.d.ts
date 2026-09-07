/**
 * Events module for event-driven architecture with history and replay.
 */
import { Pool } from "pg";
import type { EventsState, EventOptions, EventHistoryOptions, EventHistoryResult, Event, ReplayOptions, EventMetadata } from "./types.js";
export type { EventsState, EventOptions, EventHistoryOptions, EventHistoryResult, Event, ReplayOptions, EventMetadata };
/**
 * Creates a new events state with the database connection pool
 * and optional local store for caching.
 */
export declare function createEventsState(pool: Pool, localStore?: import("../storage/local/types.js").LocalStore | null): EventsState;
/**
 * Emits an event to the specified channel.
 * Stores the event in PostgreSQL and sends a NOTIFY for real-time delivery.
 */
export declare function emit(state: EventsState, options: EventOptions): Promise<string>;
/**
 * Listens for events of a specific type.
 * Returns an unsubscribe function.
 */
export declare function listen(state: EventsState, type: string, handler: (channel: string, payload: unknown, meta: EventMetadata) => void | Promise<void>): Promise<() => void>;
/**
 * Gets event history with filtering and pagination.
 */
export declare function getEventHistory(state: EventsState, options?: EventHistoryOptions): Promise<EventHistoryResult>;
/**
 * Replays events through the provided handler.
 */
export declare function replayEvents(state: EventsState, options: ReplayOptions): Promise<{
    replayed: number;
}>;
/**
 * Closes the events connection.
 */
export declare function closeEvents(state: EventsState): Promise<void>;
//# sourceMappingURL=index.d.ts.map