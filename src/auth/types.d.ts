/**
 * Authentication types for PGBloom.
 */
import { Pool } from "pg";
import type { LocalStore } from "../storage/local/types.js";
/**
 * User document from database.
 */
export interface User {
    id: string | number;
    email: string;
    name?: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Session document from database.
 */
export interface Session {
    id: string | number;
    userId: string | number;
    refreshTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
    createdAt: Date;
    revokedAt?: Date;
}
/**
 * JWT token payload.
 */
export interface TokenPayload {
    userId: string | number;
    email: string;
    type: "access" | "refresh";
    iat: number;
    exp: number;
    jti?: string;
}
/**
 * Authentication result with tokens.
 */
export interface AuthResult {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
/**
 * Auth options for configuration.
 */
export interface AuthOptions {
    accessTokenExpiry?: string;
    refreshTokenExpiry?: string;
    jwtSecret?: string;
    passwordHashAlgorithm?: "argon2id" | "bcrypt";
    argon2Options?: {
        memoryCost?: number;
        timeCost?: number;
        parallelism?: number;
    };
}
/**
 * Auth state for internal operations.
 */
export interface AuthState {
    pool: Pool;
    localStore: LocalStore | null;
    jwtSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    passwordHashAlgorithm: "argon2id" | "bcrypt";
    argon2Options: {
        memoryCost: number;
        timeCost: number;
        parallelism: number;
    };
    userModel: any;
}
/**
 * Signup input.
 */
export interface SignupInput {
    email: string;
    password: string;
    name?: string;
}
/**
 * Login input.
 */
export interface LoginInput {
    email: string;
    password: string;
}
/**
 * Password reset input.
 */
export interface ResetPasswordInput {
    email: string;
    otp: string;
    newPassword: string;
}
/**
 * OTP verification input.
 */
export interface VerifyOTPInput {
    email: string;
    otp: string;
}
/**
 * Forgot password input.
 */
export interface ForgotPasswordInput {
    email: string;
}
/**
 * OTP purposes.
 */
export type OTTPurpose = "signup" | "login" | "forgot-password" | "email-verification" | "phone-verification";
/**
 * OTP record from database.
 */
export interface OTPRecord {
    id: string | number;
    userId?: string | number;
    email: string;
    otpHash: string;
    purpose: OTTPurpose;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    used: boolean;
    createdAt: Date;
}
/**
 * OTP options.
 */
export interface OTPOptions {
    expiry?: string;
    maxAttempts?: number;
    resendCooldown?: string;
    length?: number;
}
//# sourceMappingURL=types.d.ts.map