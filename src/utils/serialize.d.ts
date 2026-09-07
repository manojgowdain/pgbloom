/**
 * Serializes a value for storage in the cache.
 *
 * Primitives (string, number, boolean, null) are converted to strings using a
 * short marker so they are not mistaken for JSON. Objects and arrays are
 * JSON-serialized and prefixed with `j:`.
 */
export declare function serialize(value: unknown): string;
//# sourceMappingURL=serialize.d.ts.map