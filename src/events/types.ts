/**
 * Events module type definitions for event history and replay.
 */

import { Pool, PoolClient } from "pg";
import { LocalStore } from "../storage/local/types.js";

/**
 * State for the events module containing the database connection pool,
 * optional local store, and LISTEN/NOTIFY infrastructure.
 */
export interface EventsState {
  pool: Pool;
  localStore: LocalStore | null;
  listeners: Map<string, Set<(channel: string, payload: unknown, meta: EventMetadata) => void | Promise<void>>>;
  listenClient: PoolClient | null;
  isListening: boolean;
}

/**
 * Metadata associated with an event.
 */
export interface EventMetadata {
  eventId: string;
  createdAt: Date;
  isReplay: boolean;
  [key: string]: unknown;
}

/**
 * Options for emitting an event.
 */
export interface EventOptions {
  type: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Options for querying event history.
 */
export interface EventHistoryOptions {
  type?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string; // event_id for pagination
}

/**
 * Result of an event history query.
 */
export interface EventHistoryResult {
  events: Event[];
  nextCursor?: string;
}

/**
 * An event record.
 */
export interface Event {
  id: number;
  eventId: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Options for replaying events.
 */
export interface ReplayOptions {
  from: Date;
  to?: Date;
  type?: string;
  handler: (event: Event) => void | Promise<void>;
}