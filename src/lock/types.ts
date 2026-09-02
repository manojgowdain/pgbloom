/**
 * Lock module type definitions for distributed locking and leader election.
 */

import { Pool } from "pg";
import { LocalStore } from "../storage/local/types.js";

/**
 * State for the lock module containing the database connection pool
 * and optional local store for caching.
 */
export interface LockState {
  pool: Pool;
  localStore: LocalStore | null;
  defaultTtl: number;
}

/**
 * Options for lock operations.
 */
export interface LockOptions {
  /**
   * Lock TTL in milliseconds. If not provided, uses the default TTL
   * from the lock state.
   */
  ttl?: number;
}

/**
 * Result of a lock acquisition attempt.
 */
export interface LockResult {
  /** Whether the lock was successfully acquired */
  acquired: boolean;
  /** The holder ID if the lock was acquired */
  holderId?: string;
  /** The expiration time of the lock if acquired */
  expiresAt?: Date;
}

/**
 * Options for leader election.
 */
export interface LeaderElectionOptions {
  /** The resource to elect a leader for (e.g., "scheduler", "cleanup") */
  resource: string;
  /** Unique identifier for this instance */
  holderId: string;
  /** Leadership TTL in milliseconds. If not provided, uses the default TTL from lock state. */
  ttl?: number;
  /** Callback when leadership is lost (lock expired or released by another) */
  onLeadershipLost?: () => void;
}

/**
 * Result of a leadership acquisition attempt.
 */
export interface LeaderElectionResult {
  /** Whether this instance is the leader */
  isLeader: boolean;
  /** When leadership was acquired (if successful) */
  acquiredAt?: Date;
  /** When leadership expires (if successful) */
  expiresAt?: Date;
}

/**
 * Internal state for tracking active leadership.
 */
export interface LeadershipState {
  resource: string;
  holderId: string;
  ttl: number;
  acquiredAt: Date;
  expiresAt: Date;
  intervalId: ReturnType<typeof setInterval> | null;
}