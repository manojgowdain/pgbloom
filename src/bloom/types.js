/**
 * Public types for the Bloom Filter module.
 *
 * A Bloom Filter is a probabilistic data structure that answers the
 * question "is this value possibly in the set?":
 *
 *   - `false` means the value is DEFINITELY not in the set (no false negatives).
 *   - `true`  means the value is MAYBE in the set (false positives possible).
 *
 * It must never be used as the source of truth — only as a way to skip
 * an unnecessary lookup when the value is almost certainly absent.
 */
/**
 * Errors thrown by the Bloom Filter module.
 */
export class BloomFilterError extends Error {
    constructor(message) {
        super(message);
        this.name = "BloomFilterError";
    }
}
export class BloomFilterConfigError extends BloomFilterError {
    constructor(message) {
        super(message);
        this.name = "BloomFilterConfigError";
    }
}
//# sourceMappingURL=types.js.map