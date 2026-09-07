/**
 * Custom error classes used by PGBloom.
 */
export declare class PGBloomError extends Error {
    constructor(message: string);
}
export declare class PGBloomDatabaseError extends PGBloomError {
    constructor(message: string);
}
export declare class PGBloomValidationError extends PGBloomError {
    constructor(message: string);
}
export declare class PGBloomAuthError extends PGBloomError {
    constructor(message: string);
}
export declare class PGBloomOTPError extends PGBloomError {
    constructor(message: string);
}
export declare class PGBloomConfigError extends PGBloomError {
    constructor(message: string);
}
export declare class PGSnapError extends PGBloomError {
    constructor(message: string);
}
export declare class PGSnapConnectionError extends PGBloomDatabaseError {
    constructor(message: string);
}
export declare class PGSnapKeyError extends PGBloomValidationError {
    constructor(message: string);
}
export declare class PGSnapExpiryError extends PGBloomError {
    constructor(message: string);
}
export declare class PGSnapSerializationError extends PGBloomError {
    constructor(message: string);
}
export declare class PGSnapDeserializationError extends PGBloomError {
    constructor(message: string);
}
/**
 * Maximum allowed length of a cache key.
 */
export declare const MAX_KEY_LENGTH = 255;
/**
 * Validates a cache key. Throws PGSnapKeyError on invalid input.
 */
export declare function validateKey(key: unknown): asserts key is string;
/**
 * Validates a PostgreSQL connection string. Throws PGSnapConnectionError on invalid input.
 */
export declare function validateConnectionString(url: unknown): asserts url is string;
//# sourceMappingURL=validation.d.ts.map