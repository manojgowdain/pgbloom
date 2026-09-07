/**
 * Password hashing using Argon2id.
 */
import { PGBloomError } from "../utils/validation.js";
/**
 * Default Argon2id options (OWASP recommended baseline).
 */
export const DEFAULT_ARGON2_OPTIONS = {
    memoryCost: 19456, // ~19 MB
    timeCost: 2,
    parallelism: 1,
};
/**
 * Hashes a password using Argon2id.
 * @throws PGBloomError if hashing fails
 */
export async function hashPassword(password, options = {}) {
    try {
        // Dynamic import to handle optional dependency
        const argon2 = await import("@node-rs/argon2");
        const opts = { ...DEFAULT_ARGON2_OPTIONS, ...options };
        const hash = await argon2.hash(password, {
            memoryCost: opts.memoryCost,
            timeCost: opts.timeCost,
            parallelism: opts.parallelism,
            algorithm: 2 /* argon2.Algorithm.Argon2id */,
        });
        return hash;
    }
    catch (err) {
        if (err.message.includes("Cannot find module")) {
            throw new PGBloomError("Password hashing requires @node-rs/argon2. Please install it: npm install @node-rs/argon2");
        }
        throw new PGBloomError(`Failed to hash password: ${err.message}`);
    }
}
/**
 * Verifies a password against an Argon2id hash.
 * @throws PGBloomError if verification fails
 */
export async function verifyPassword(password, hash) {
    try {
        const argon2 = await import("@node-rs/argon2");
        return await argon2.verify(hash, password);
    }
    catch (err) {
        if (err.message.includes("Cannot find module")) {
            throw new PGBloomError("Password verification requires @node-rs/argon2. Please install it: npm install @node-rs/argon2");
        }
        throw new PGBloomError(`Failed to verify password: ${err.message}`);
    }
}
/**
 * Checks if a hash needs rehashing (e.g., parameters changed).
 */
export async function needsRehash(hash, options = {}) {
    try {
        const argon2 = await import("@node-rs/argon2");
        const opts = { ...DEFAULT_ARGON2_OPTIONS, ...options };
        const parsed = argon2.parseOptions(hash);
        return (parsed.memoryCost !== opts.memoryCost ||
            parsed.timeCost !== opts.timeCost ||
            parsed.parallelism !== opts.parallelism ||
            parsed.algorithm !== 2 /* argon2.Algorithm.Argon2id */);
    }
    catch {
        return true; // If we can't check, assume rehash needed
    }
}
//# sourceMappingURL=password.js.map