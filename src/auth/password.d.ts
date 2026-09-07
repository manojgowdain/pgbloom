/**
 * Password hashing using Argon2id.
 */
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
export declare const DEFAULT_ARGON2_OPTIONS: Required<PasswordHashOptions>;
/**
 * Hashes a password using Argon2id.
 * @throws PGBloomError if hashing fails
 */
export declare function hashPassword(password: string, options?: PasswordHashOptions): Promise<string>;
/**
 * Verifies a password against an Argon2id hash.
 * @throws PGBloomError if verification fails
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * Checks if a hash needs rehashing (e.g., parameters changed).
 */
export declare function needsRehash(hash: string, options?: PasswordHashOptions): Promise<boolean>;
//# sourceMappingURL=password.d.ts.map