/**
 * Fixed Window Rate Limiter implementation.
 */
import type { RateLimitState, RateLimitOptions, RateLimitResult } from "./types.js";
/**
 * Checks and consumes a rate limit using the fixed window algorithm.
 * Returns the rate limit result with allowed status and metadata.
 */
export declare function fixedWindow(state: RateLimitState, options: RateLimitOptions): Promise<RateLimitResult>;
//# sourceMappingURL=fixed-window.d.ts.map