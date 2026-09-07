/**
 * Authentication module for PGBloom.
 */
import { Pool } from "pg";
import type { LocalStore } from "../storage/local/types.js";
import { type Model } from "../model/index.js";
import type { User } from "./types.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createAccessToken, createRefreshToken, verifyToken, hashRefreshToken, parseExpiry, extractBearerToken, type AuthOptions } from "./tokens.js";
import { sendOTP, verifyOTP, resendOTP, cleanupExpiredOTPs, createOTPState, type OTPOptions, type OTTPurpose } from "./otp.js";
import type { Session, TokenPayload, AuthResult, AuthState, SignupInput, LoginInput, ResetPasswordInput, VerifyOTPInput, ForgotPasswordInput } from "./types.js";
export type { User, Session, TokenPayload, AuthResult, AuthOptions, AuthState, SignupInput, LoginInput, ResetPasswordInput, VerifyOTPInput, ForgotPasswordInput, OTTPurpose, OTPOptions, };
export { hashPassword, verifyPassword, createAccessToken, createRefreshToken, verifyToken, hashRefreshToken, parseExpiry, extractBearerToken, sendOTP, verifyOTP, resendOTP, cleanupExpiredOTPs, createOTPState, };
/**
 * Creates auth state from pool and options.
 */
export declare function createAuthState(pool: Pool, localStore: LocalStore | null, options: AuthOptions): AuthState;
/**
 * Authentication class providing high-level auth API.
 */
export declare class Auth {
    private state;
    constructor(state: AuthState);
    /**
     * Gets the user model for direct CRUD operations.
     */
    get users(): Model<User>;
    /**
     * Signs up a new user.
     */
    signup(input: SignupInput): Promise<AuthResult>;
    /**
     * Logs in a user with email and password.
     */
    login(input: LoginInput): Promise<AuthResult>;
    /**
     * Logs out a user (revokes refresh token).
     */
    logout(refreshToken: string): Promise<void>;
    /**
     * Refreshes an access token using a refresh token.
     */
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Verifies an access token and returns the payload.
     */
    verifyToken(token: string): Promise<TokenPayload | null>;
    /**
     * Gets the current user from an access token.
     */
    me(accessToken: string): Promise<User | null>;
    /**
     * Sends a password reset OTP.
     */
    forgotPassword(input: ForgotPasswordInput): Promise<void>;
    /**
     * Resets password using OTP.
     */
    resetPassword(input: ResetPasswordInput): Promise<void>;
    /**
     * Sends an email verification OTP.
     */
    sendVerificationOTP(email: string): Promise<void>;
    /**
     * Verifies email using OTP.
     */
    verifyEmail(input: VerifyOTPInput): Promise<void>;
    /**
     * Sends an OTP for login (passwordless login).
     */
    sendLoginOTP(email: string): Promise<{
        otpId: string;
        expiresAt: Date;
    }>;
    /**
     * Verifies a login OTP and returns tokens.
     */
    verifyLoginOTP(input: VerifyOTPInput): Promise<AuthResult>;
    /**
     * Cleans up expired sessions and OTPs.
     */
    cleanup(): Promise<{
        sessions: number;
        otps: number;
    }>;
}
/**
 * Factory function to create Auth instance.
 */
export declare function createAuth(pool: Pool, localStore: LocalStore | null, options?: AuthOptions): Auth;
//# sourceMappingURL=index.d.ts.map