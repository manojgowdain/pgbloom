/**
 * Deserializes a value from its stored string representation.
 *
 * This mirrors the serialization format in serialize.ts.
 */

import { PGSnapDeserializationError } from "./validation.js";

const JSON_PREFIX = "j:";

export function deserialize(value: string): unknown {
  if (value.startsWith("n:")) {
    return null;
  }

  if (value.startsWith("s:")) {
    return value.slice(2);
  }

  if (value.startsWith("num:")) {
    return Number(value.slice(4));
  }

  if (value.startsWith("b:")) {
    return value === "b:1";
  }

  if (value.startsWith(JSON_PREFIX)) {
    try {
      return JSON.parse(value.slice(JSON_PREFIX.length));
    } catch (err) {
      throw new PGSnapDeserializationError(
        `Failed to parse JSON value: ${(err as Error).message}`,
      );
    }
  }

  throw new PGSnapDeserializationError(
    `Unknown serialization format for value: ${value}`,
  );
}