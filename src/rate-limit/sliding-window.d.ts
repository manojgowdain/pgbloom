/**
 * Sliding Window Rate Limiter implementation.
 */
import type { RateLimitState, RateLimitOptions, RateLimitResult } from "./types.js";
/**
 * Checks and consumes a rate limit using the sliding window algorithm.
 * Returns the rate limit result with allowed status and metadata.
 */
export declare function slidingWindow(state: RateLimitState, options: RateLimitOptions): Promise<RateLimitResult>;
//# sourceMappingURL=sliding-window.d.ts.map