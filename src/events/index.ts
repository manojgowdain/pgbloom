/**
 * Events module for event-driven architecture with history and replay.
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  insertEvent,
  getEventHistory as getEventHistoryQuery,
  getEventById as getEventByIdQuery,
} from "./queries.js";
import type {
  EventsState,
  EventOptions,
  EventHistoryOptions,
  EventHistoryResult,
  Event,
  ReplayOptions,
  EventMetadata,
} from "./types.js";

export type { EventsState, EventOptions, EventHistoryOptions, EventHistoryResult, Event, ReplayOptions, EventMetadata };

/**
 * Creates a new events state with the database connection pool
 * and optional local store for caching.
 */
export function createEventsState(
  pool: Pool,
  localStore: import("../storage/local/types.js").LocalStore | null = null
): EventsState {
  return {
    pool,
    localStore,
    listeners: new Map(),
    listenClient: null,
    isListening: false,
  };
}

/**
 * Ensures the LISTEN connection is established.
 */
async function ensureListening(state: EventsState): Promise<void> {
  if (state.isListening) {
    return;
  }

  const client = await state.pool.connect();
  state.listenClient = client;
  state.isListening = true;

  client.on("notification", (msg) => {
    const channel = msg.channel;
    if (typeof channel !== "string") return;
    const payloadStr = msg.payload;
    if (typeof payloadStr !== "string") return;

    let payload: { eventId: string; type: string; payload: unknown; createdAt: string; metadata?: Record<string, unknown> };
    try {
      payload = JSON.parse(payloadStr) as { eventId: string; type: string; payload: unknown; createdAt: string; metadata?: Record<string, unknown> };
    } catch {
      return;
    }

    const handlers = state.listeners.get(payload.type);
    if (handlers) {
      const meta: EventMetadata = {
        eventId: payload.eventId,
        createdAt: new Date(payload.createdAt),
        isReplay: (payload.metadata?.isReplay as boolean) ?? false,
        ...(payload.metadata ? { ...payload.metadata } : {}),
      };

      for (const handler of handlers) {
        // Fire and forget - don't await to avoid blocking
        Promise.resolve(handler(channel, payload.payload, meta)).catch(() => {
          // Silently ignore handler errors to not break the listener
        });
      }
    }
  });

  client.on("error", () => {
    state.isListening = false;
    state.listenClient = null;
  });
}

/**
 * Emits an event to the specified channel.
 * Stores the event in PostgreSQL and sends a NOTIFY for real-time delivery.
 */
export async function emit(
  state: EventsState,
  options: EventOptions
): Promise<string> {
  const eventId = randomUUID();
  await insertEvent(state.pool, eventId, options.type, options.payload, options.metadata);
  return eventId;
}

/**
 * Listens for events of a specific type.
 * Returns an unsubscribe function.
 */
export async function listen(
  state: EventsState,
  type: string,
  handler: (channel: string, payload: unknown, meta: EventMetadata) => void | Promise<void>
): Promise<() => void> {
  await ensureListening(state);

  // Add handler to our local map
  let handlers = state.listeners.get(type);
  if (!handlers) {
    handlers = new Set();
    state.listeners.set(type, handlers);
  }
  handlers.add(handler);

  // If this is the first handler for this channel, issue LISTEN
  if (handlers.size === 1 && state.listenClient) {
    await state.listenClient.query(`LISTEN "pgbloom_events"`).catch(() => {});
  }

  // Return unsubscribe function
  return async () => {
    const currentHandlers = state.listeners.get(type);
    if (currentHandlers) {
      currentHandlers.delete(handler);
      if (currentHandlers.size === 0) {
        state.listeners.delete(type);
        if (state.listenClient) {
          await state.listenClient.query(`UNLISTEN "pgbloom_events"`).catch(() => {});
        }
      }
    }
  };
}

/**
 * Gets event history with filtering and pagination.
 */
export async function getEventHistory(
  state: EventsState,
  options: EventHistoryOptions = {}
): Promise<EventHistoryResult> {
  return getEventHistoryQuery(state.pool, options);
}

/**
 * Replays events through the provided handler.
 */
export async function replayEvents(
  state: EventsState,
  options: ReplayOptions
): Promise<{ replayed: number }> {
  const { from, to, type, handler } = options;
  let replayed = 0;
  let cursor: string | undefined;

  while (true) {
    const result = await getEventHistoryQuery(state.pool, {
      type,
      from,
      to,
      limit: 100,
      cursor,
    });

    if (result.events.length === 0) {
      break;
    }

    for (const event of result.events) {
      const replayEvent = {
        ...event,
        metadata: {
          ...event.metadata,
          isReplay: true,
        },
      } as Event;

      await handler(replayEvent);
      replayed++;
    }

    if (!result.nextCursor) {
      break;
    }
    cursor = result.nextCursor;
  }

  return { replayed };
}

/**
 * Closes the events connection.
 */
export async function closeEvents(state: EventsState): Promise<void> {
  if (state.listenClient) {
    state.listenClient.release();
    state.listenClient = null;
    state.isListening = false;
  }
  state.listeners.clear();
}