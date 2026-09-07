/**
 * JWT token generation and verification.
 */
import type { TokenPayload, AuthOptions } from "./types.js";
export type { AuthOptions };
/**
 * Parses expiry string (e.g., "15m", "1h", "7d", "30d") to seconds.
 */
export declare function parseExpiry(expiry: string): number;
/**
 * Generates a secure random token ID (JTI).
 */
export declare function generateTokenId(): string;
/**
 * Generates a secure random refresh token.
 */
export declare function generateRefreshToken(): string;
/**
 * Hashes a refresh token for storage.
 */
export declare function hashRefreshToken(token: string): Promise<string>;
/**
 * Creates an access token.
 */
export declare function createAccessToken(payload: Omit<TokenPayload, "type" | "iat" | "exp">, options: AuthOptions): string;
/**
 * Creates a refresh token.
 */
export declare function createRefreshToken(payload: Omit<TokenPayload, "type" | "iat" | "exp">, options: AuthOptions): string;
/**
 * Verifies a token and returns the payload.
 */
export declare function verifyToken(token: string, options: AuthOptions): TokenPayload | null;
/**
 * Decodes a token without verification (for debugging).
 */
export declare function decodeToken(token: string): TokenPayload | null;
/**
 * Extracts token from Authorization header.
 */
export declare function extractBearerToken(authHeader: string | undefined): string | null;
//# sourceMappingURL=tokens.d.ts.map