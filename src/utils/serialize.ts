import { PGSnapSerializationError } from "./validation.js";

/**
 * Marker prepended to serialized JSON values so we can round-trip them safely
 * alongside primitives that are stored as plain strings.
 */
const JSON_PREFIX = "j:";

/**
 * Serializes a value for storage in the cache.
 *
 * Primitives (string, number, boolean, null) are converted to strings using a
 * short marker so they are not mistaken for JSON. Objects and arrays are
 * JSON-serialized and prefixed with `j:`.
 */
export function serialize(value: unknown): string {
  if (value === null) {
    return "n:null";
  }

  if (typeof value === "string") {
    return "s:" + value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new PGSnapSerializationError(
        "Cannot serialize non-finite number values.",
      );
    }
    return "num:" + String(value);
  }

  if (typeof value === "boolean") {
    return value ? "b:1" : "b:0";
  }

  if (typeof value === "object") {
    try {
      return JSON_PREFIX + JSON.stringify(value);
    } catch (err) {
      throw new PGSnapSerializationError(
        `Failed to serialize value: ${(err as Error).message}`,
      );
    }
  }

  throw new PGSnapSerializationError(
    `Cannot serialize value of type ${typeof value}.`,
  );
}
