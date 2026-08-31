/**
 * Pub/Sub module using PostgreSQL LISTEN/NOTIFY.
 */

import { Pool, PoolClient } from "pg";

export type MessageHandler = (channel: string, payload: unknown) => void | Promise<void>;

export interface PubSubState {
  pool: Pool;
  listeners: Map<string, Set<MessageHandler>>;
  listenClient: PoolClient | null;
  isListening: boolean;
}

export function createPubSubState(pool: Pool): PubSubState {
  return {
    pool,
    listeners: new Map(),
    listenClient: null,
    isListening: false,
  };
}

/**
 * Starts the LISTEN connection if not already started.
 */
async function ensureListening(state: PubSubState): Promise<void> {
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
    const handlers = state.listeners.get(channel);
    if (handlers) {
      let payload: unknown;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        payload = payloadStr;
      }
      for (const handler of handlers) {
        // Fire and forget - don't await to avoid blocking
        Promise.resolve(handler(channel, payload)).catch(() => {
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
 * Subscribes to a channel.
 */
export async function subscribe(
  state: PubSubState,
  channel: string,
  handler: MessageHandler,
): Promise<() => void> {
  await ensureListening(state);

  // Add handler to our local map
  let handlers = state.listeners.get(channel);
  if (!handlers) {
    handlers = new Set();
    state.listeners.set(channel, handlers);
  }
  handlers.add(handler);

  // If this is the first handler for this channel, issue LISTEN
  if (handlers.size === 1 && state.listenClient) {
    await state.listenClient.query(`LISTEN "${channel}"`);
  }

  // Return unsubscribe function
  return async () => {
    const currentHandlers = state.listeners.get(channel);
    if (currentHandlers) {
      currentHandlers.delete(handler);
      if (currentHandlers.size === 0) {
        state.listeners.delete(channel);
        if (state.listenClient) {
          await state.listenClient.query(`UNLISTEN "${channel}"`).catch(() => {});
        }
      }
    }
  };
}

/**
 * Publishes a message to a channel.
 */
export async function publish(
  pool: Pool,
  channel: string,
  payload: unknown,
): Promise<void> {
  const json = JSON.stringify(payload);
  await pool.query(`NOTIFY "${channel}", $1`, [json]);
}

/**
 * Closes the pub/sub connection.
 */
export async function closePubSub(state: PubSubState): Promise<void> {
  if (state.listenClient) {
    state.listenClient.release();
    state.listenClient = null;
    state.isListening = false;
  }
  state.listeners.clear();
}