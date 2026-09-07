/**
 * SQL queries for authentication operations.
 */
import { Pool } from "pg";
import type { User, Session } from "./types.js";
/**
 * Creates a new user.
 */
export declare function createUser(pool: Pool, email: string, passwordHash: string, name?: string): Promise<User>;
/**
 * Finds a user by email.
 */
export declare function findUserByEmail(pool: Pool, email: string): Promise<User | null>;
/**
 * Finds a user by ID.
 */
export declare function findUserById(pool: Pool, id: string | number): Promise<User | null>;
/**
 * Updates a user's email verification status.
 */
export declare function setUserEmailVerified(pool: Pool, userId: string | number): Promise<void>;
/**
 * Updates a user's password.
 */
export declare function updateUserPassword(pool: Pool, userId: string | number, passwordHash: string): Promise<void>;
/**
 * Creates a new session (refresh token).
 */
export declare function createSession(pool: Pool, userId: string | number, refreshToken: string, userAgent?: string, ipAddress?: string, expiresAt?: Date): Promise<Session>;
/**
 * Finds a session by refresh token hash.
 */
export declare function findSessionByRefreshTokenHash(pool: Pool, refreshTokenHash: string): Promise<Session | null>;
/**
 * Finds all sessions for a user.
 */
export declare function findSessionsByUserId(pool: Pool, userId: string | number): Promise<Session[]>;
/**
 * Revokes a session (logout).
 */
export declare function revokeSession(pool: Pool, sessionId: string | number): Promise<void>;
/**
 * Revokes all sessions for a user.
 */
export declare function revokeAllUserSessions(pool: Pool, userId: string | number): Promise<void>;
/**
 * Cleans up expired sessions.
 */
export declare function cleanupExpiredSessions(pool: Pool): Promise<number>;
//# sourceMappingURL=queries.d.ts.map