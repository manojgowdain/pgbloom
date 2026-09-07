/**
 * Password hashing using Argon2id.
 */

import { PGBloomError } from "../utils/validation.js";

/**
 * Password hashing options.
 */
export interface PasswordHashOptions {
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
}

/**
 * Default Argon2id options (OWASP recommended baseline).
 */
export const DEFAULT_ARGON2_OPTIONS: Required<PasswordHashOptions> = {
  memoryCost: 19456, // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hashes a password using Argon2id.
 * @throws PGBloomError if hashing fails
 */
export async function hashPassword(password: string, options: PasswordHashOptions = {}): Promise<string> {
  try {
    // Dynamic import to handle optional dependency
    const argon2 = await import("@node-rs/argon2");

    const opts = { ...DEFAULT_ARGON2_OPTIONS, ...options };
    const hash = await argon2.hash(password, {
      memoryCost: opts.memoryCost,
      timeCost: opts.timeCost,
      parallelism: opts.parallelism,
      algorithm: argon2.Algorithm.Argon2id,
    });

    return hash;
  } catch (err) {
    if ((err as Error).message.includes("Cannot find module")) {
      throw new PGBloomError(
        "Password hashing requires @node-rs/argon2. Please install it: npm install @node-rs/argon2"
      );
    }
    throw new PGBloomError(`Failed to hash password: ${(err as Error).message}`);
  }
}

/**
 * Verifies a password against an Argon2id hash.
 * @throws PGBloomError if verification fails
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const argon2 = await import("@node-rs/argon2");
    return await argon2.verify(hash, password);
  } catch (err) {
    if ((err as Error).message.includes("Cannot find module")) {
      throw new PGBloomError(
        "Password verification requires @node-rs/argon2. Please install it: npm install @node-rs/argon2"
      );
    }
    throw new PGBloomError(`Failed to verify password: ${(err as Error).message}`);
  }
}

/**
 * Checks if a hash needs rehashing (e.g., parameters changed).
 */
export async function needsRehash(hash: string, options: PasswordHashOptions = {}): Promise<boolean> {
  try {
    const argon2 = await import("@node-rs/argon2");
    const opts = { ...DEFAULT_ARGON2_OPTIONS, ...options };
    const parsed = argon2.parseOptions(hash);
    return (
      parsed.memoryCost !== opts.memoryCost ||
      parsed.timeCost !== opts.timeCost ||
      parsed.parallelism !== opts.parallelism ||
      parsed.algorithm !== argon2.Algorithm.Argon2id
    );
  } catch {
    return true; // If we can't check, assume rehash needed
  }
}