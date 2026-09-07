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
export declare function createPubSubState(pool: Pool): PubSubState;
/**
 * Subscribes to a channel.
 */
export declare function subscribe(state: PubSubState, channel: string, handler: MessageHandler): Promise<() => void>;
/**
 * Publishes a message to a channel.
 */
export declare function publish(pool: Pool, channel: string, payload: unknown): Promise<void>;
/**
 * Closes the pub/sub connection.
 */
export declare function closePubSub(state: PubSubState): Promise<void>;
//# sourceMappingURL=index.d.ts.map