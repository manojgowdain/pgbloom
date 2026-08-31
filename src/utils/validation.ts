/**
 * Custom error classes used by PGSnap.
 */

export class PGSnapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PGSnapError";
  }
}

export class PGSnapConnectionError extends PGSnapError {
  constructor(message: string) {
    super(message);
    this.name = "PGSnapConnectionError";
  }
}

export class PGSnapKeyError extends PGSnapError {
  constructor(message: string) {
    super(message);
    this.name = "PGSnapKeyError";
  }
}

export class PGSnapExpiryError extends PGSnapError {
  constructor(message: string) {
    super(message);
    this.name = "PGSnapExpiryError";
  }
}

export class PGSnapSerializationError extends PGSnapError {
  constructor(message: string) {
    super(message);
    this.name = "PGSnapSerializationError";
  }
}

export class PGSnapDeserializationError extends PGSnapError {
  constructor(message: string) {
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
export function validateKey(key: unknown): asserts key is string {
  if (typeof key !== "string") {
    throw new PGSnapKeyError(
      `Invalid cache key: expected a string, received ${typeof key}.`,
    );
  }

  if (key.length === 0) {
    throw new PGSnapKeyError("Invalid cache key: key must not be empty.");
  }

  if (key.length > MAX_KEY_LENGTH) {
    throw new PGSnapKeyError(
      `Invalid cache key: key must be ${MAX_KEY_LENGTH} characters or fewer (received ${key.length}).`,
    );
  }
}

/**
 * Validates a PostgreSQL connection string. Throws PGSnapConnectionError on invalid input.
 */
export function validateConnectionString(url: unknown): asserts url is string {
  if (typeof url !== "string") {
    throw new PGSnapConnectionError(
      `Invalid PostgreSQL URL: expected a string, received ${typeof url}.`,
    );
  }

  if (url.trim().length === 0) {
    throw new PGSnapConnectionError(
      "Invalid PostgreSQL URL: connection string must not be empty.",
    );
  }

  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new PGSnapConnectionError(
      "Invalid PostgreSQL URL: must start with postgres:// or postgresql://.",
    );
  }
}
