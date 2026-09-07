/**
 * OTP (One-Time Password) generation and verification.
 */
import { Pool } from "pg";
import type { AuthState, OTPRecord, OTPOptions, OTTPurpose } from "./types.js";
export type { OTPOptions, OTTPurpose };
/**
 * Parses duration string (e.g., "5m", "60s", "2h") to milliseconds.
 */
export declare function parseDuration(duration: string): number;
/**
 * Generates a secure random OTP code.
 */
export declare function generateOTP(length?: number): string;
/**
 * Creates OTP state with default options.
 */
export declare function createOTPState(pool: Pool, options?: OTPOptions): Required<OTPOptions>;
/**
 * Sends an OTP to an email (stores hashed OTP in database).
 * In a real implementation, this would integrate with an email service.
 */
export declare function sendOTP(state: AuthState, email: string, purpose: OTTPurpose, userId?: string | number, otpOptions?: OTPOptions): Promise<{
    otpId: string;
    expiresAt: Date;
}>;
/**
 * Verifies an OTP code.
 */
export declare function verifyOTP(state: AuthState, email: string, otp: string, purpose: OTTPurpose, otpOptions?: OTPOptions): Promise<{
    valid: boolean;
    userId?: string | number;
    otpRecord?: OTPRecord;
}>;
/**
 * Resends an OTP (invalidates previous unused OTPs for same email/purpose).
 */
export declare function resendOTP(state: AuthState, email: string, purpose: OTTPurpose, userId?: string | number, otpOptions?: OTPOptions): Promise<{
    otpId: string;
    expiresAt: Date;
}>;
/**
 * Cleans up expired OTP codes.
 */
export declare function cleanupExpiredOTPs(state: AuthState): Promise<number>;
/**
 * Gets OTP record by ID (for debugging/admin).
 */
export declare function getOTPById(state: AuthState, id: string | number): Promise<OTPRecord | null>;
//# sourceMappingURL=otp.d.ts.map