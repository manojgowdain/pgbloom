/**
 * JWT token generation and verification.
 */

import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { PGBloomAuthError, PGBloomError } from "../utils/validation.js";
import type { TokenPayload, AuthOptions } from "./types.js";

export type { AuthOptions };

/**
 * Parses expiry string (e.g., "15m", "1h", "7d", "30d") to seconds.
 */
export function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new PGBloomError(`Invalid expiry format: ${expiry}. Use format like "15m", "1h", "7d", "30d"`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      throw new PGBloomError(`Unknown time unit: ${unit}`);
  }
}

/**
 * Generates a secure random token ID (JTI).
 */
export function generateTokenId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Generates a secure random refresh token.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes a refresh token for storage.
 */
export async function hashRefreshToken(token: string): Promise<string> {
  // Use a simple but secure hash for refresh token storage
  // In production, could use Argon2id here too
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates an access token.
 */
export function createAccessToken(
  payload: Omit<TokenPayload, "type" | "iat" | "exp">,
  options: AuthOptions
): string {
  const expirySeconds = parseExpiry(options.accessTokenExpiry || "15m");
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload: TokenPayload = {
    ...payload,
    type: "access",
    iat: now,
    exp: now + expirySeconds,
    jti: generateTokenId(),
  };

  if (!options.jwtSecret) {
    throw new PGBloomAuthError("JWT secret not configured. Set auth.jwtSecret in options or JWT_SECRET env var.");
  }

  return jwt.sign(tokenPayload, options.jwtSecret, { algorithm: "HS256" });
}

/**
 * Creates a refresh token.
 */
export function createRefreshToken(
  payload: Omit<TokenPayload, "type" | "iat" | "exp">,
  options: AuthOptions
): string {
  const expirySeconds = parseExpiry(options.refreshTokenExpiry || "30d");
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload: TokenPayload = {
    ...payload,
    type: "refresh",
    iat: now,
    exp: now + expirySeconds,
    jti: generateTokenId(),
  };

  if (!options.jwtSecret) {
    throw new PGBloomAuthError("JWT secret not configured. Set auth.jwtSecret in options or JWT_SECRET env var.");
  }

  return jwt.sign(tokenPayload, options.jwtSecret, { algorithm: "HS256" });
}

/**
 * Verifies a token and returns the payload.
 */
export function verifyToken(token: string, options: AuthOptions): TokenPayload | null {
  if (!options.jwtSecret) {
    throw new PGBloomAuthError("JWT secret not configured");
  }

  try {
    const payload = jwt.verify(token, options.jwtSecret, { algorithms: ["HS256"] }) as TokenPayload;
    return payload;
  } catch (err) {
    if ((err as Error).name === "TokenExpiredError") {
      return null; // Expired but valid signature
    }
    if ((err as Error).name === "JsonWebTokenError") {
      return null; // Invalid signature
    }
    throw new PGBloomAuthError(`Token verification failed: ${(err as Error).message}`);
  }
}

/**
 * Decodes a token without verification (for debugging).
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts token from Authorization header.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}