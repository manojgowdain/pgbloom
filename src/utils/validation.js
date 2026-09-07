/**
 * Custom error classes used by PGBloom.
 */
export class PGBloomError extends Error {
    constructor(message) {
        super(message);
        this.name = "PGBloomError";
    }
}
export class PGBloomDatabaseError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGBloomDatabaseError";
    }
}
export class PGBloomValidationError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGBloomValidationError";
    }
}
export class PGBloomAuthError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGBloomAuthError";
    }
}
export class PGBloomOTPError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGBloomOTPError";
    }
}
export class PGBloomConfigError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGBloomConfigError";
    }
}
// Legacy aliases for backward compatibility
export class PGSnapError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGSnapError";
    }
}
export class PGSnapConnectionError extends PGBloomDatabaseError {
    constructor(message) {
        super(message);
        this.name = "PGSnapConnectionError";
    }
}
export class PGSnapKeyError extends PGBloomValidationError {
    constructor(message) {
        super(message);
        this.name = "PGSnapKeyError";
    }
}
export class PGSnapExpiryError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGSnapExpiryError";
    }
}
export class PGSnapSerializationError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGSnapSerializationError";
    }
}
export class PGSnapDeserializationError extends PGBloomError {
    constructor(message) {
        super(message);
        this.name = "PGSnapDeserializationError";
    }
}
/**
 * Maximum allowed length of a cache key.
 */
export const MAX_KEY_LENGTH = 255;
/**
 * Validates a cache key. Throws PGSnapKeyError on invalid input.
 */
export function validateKey(key) {
    if (typeof key !== "string") {
        throw new PGSnapKeyError(`Invalid cache key: expected a string, received ${typeof key}.`);
    }
    if (key.length === 0) {
        throw new PGSnapKeyError("Invalid cache key: key must not be empty.");
    }
    if (key.length > MAX_KEY_LENGTH) {
        throw new PGSnapKeyError(`Invalid cache key: key must be ${MAX_KEY_LENGTH} characters or fewer (received ${key.length}).`);
    }
}
/**
 * Validates a PostgreSQL connection string. Throws PGSnapConnectionError on invalid input.
 */
export function validateConnectionString(url) {
    if (typeof url !== "string") {
        throw new PGSnapConnectionError(`Invalid PostgreSQL URL: expected a string, received ${typeof url}.`);
    }
    if (url.trim().length === 0) {
        throw new PGSnapConnectionError("Invalid PostgreSQL URL: connection string must not be empty.");
    }
    if (!/^postgres(ql)?:\/\//i.test(url)) {
        throw new PGSnapConnectionError("Invalid PostgreSQL URL: must start with postgres:// or postgresql://.");
    }
}
//# sourceMappingURL=validation.js.map