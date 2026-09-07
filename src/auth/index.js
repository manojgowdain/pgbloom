/**
 * Authentication module for PGBloom.
 */
import { createModel } from "../model/index.js";
import { createUser, findUserByEmail, findUserById, setUserEmailVerified, updateUserPassword, createSession, findSessionByRefreshTokenHash, revokeSession, revokeAllUserSessions, cleanupExpiredSessions, } from "./queries.js";
import { hashPassword, verifyPassword, } from "./password.js";
import { createAccessToken, createRefreshToken, verifyToken, hashRefreshToken, parseExpiry, extractBearerToken, } from "./tokens.js";
import { sendOTP, verifyOTP, resendOTP, cleanupExpiredOTPs, createOTPState, } from "./otp.js";
import { PGBloomAuthError, PGBloomOTPError } from "../utils/validation.js";
export { hashPassword, verifyPassword, createAccessToken, createRefreshToken, verifyToken, hashRefreshToken, parseExpiry, extractBearerToken, sendOTP, verifyOTP, resendOTP, cleanupExpiredOTPs, createOTPState, };
/**
 * Default auth options.
 */
const DEFAULT_AUTH_OPTIONS = {
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "30d",
    jwtSecret: "",
    passwordHashAlgorithm: "argon2id",
    argon2Options: {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
    },
};
/**
 * Creates auth state from pool and options.
 */
export function createAuthState(pool, localStore, options) {
    const opts = { ...DEFAULT_AUTH_OPTIONS, ...options };
    // Get JWT secret from options or environment
    const jwtSecret = opts.jwtSecret || process.env.JWT_SECRET || process.env.PGBLOOM_JWT_SECRET;
    if (!jwtSecret) {
        throw new PGBloomAuthError("JWT secret is required. Set auth.jwtSecret in options or JWT_SECRET/PGBLOOM_JWT_SECRET environment variable.");
    }
    // Create user model for CRUD operations
    const userSchema = {
        email: { type: "string", required: true, unique: true },
        password_hash: { type: "string", required: true },
        name: { type: "string" },
        email_verified: { type: "boolean", required: true, default: false },
    };
    const userModel = createModel(pool, "pgbloom_users", userSchema, {
        cache: false, // Never cache user data (contains password hashes)
        timestamps: true,
    }, localStore);
    return {
        pool,
        localStore,
        jwtSecret,
        accessTokenExpiry: opts.accessTokenExpiry,
        refreshTokenExpiry: opts.refreshTokenExpiry,
        passwordHashAlgorithm: opts.passwordHashAlgorithm,
        argon2Options: {
            memoryCost: opts.argon2Options.memoryCost ?? 19456,
            timeCost: opts.argon2Options.timeCost ?? 2,
            parallelism: opts.argon2Options.parallelism ?? 1,
        },
        userModel,
    };
}
/**
 * Authentication class providing high-level auth API.
 */
export class Auth {
    state;
    constructor(state) {
        this.state = state;
    }
    /**
     * Gets the user model for direct CRUD operations.
     */
    get users() {
        return this.state.userModel;
    }
    /**
     * Signs up a new user.
     */
    async signup(input) {
        const { email, password, name } = input;
        // Check if user already exists
        const existing = await findUserByEmail(this.state.pool, email);
        if (existing) {
            throw new PGBloomAuthError("User with this email already exists");
        }
        // Hash password
        const passwordHash = await hashPassword(password, this.state.argon2Options);
        // Create user
        const user = await createUser(this.state.pool, email, passwordHash, name);
        // Generate tokens
        const accessToken = createAccessToken({ userId: user.id, email: user.email }, { jwtSecret: this.state.jwtSecret, accessTokenExpiry: this.state.accessTokenExpiry });
        const refreshToken = createRefreshToken({ userId: user.id, email: user.email }, { jwtSecret: this.state.jwtSecret, refreshTokenExpiry: this.state.refreshTokenExpiry });
        // Create session
        await createSession(this.state.pool, user.id, refreshToken);
        return {
            user,
            accessToken,
            refreshToken,
            expiresIn: parseExpiry(this.state.accessTokenExpiry),
        };
    }
    /**
     * Logs in a user with email and password.
     */
    async login(input) {
        const { email, password } = input;
        // Find user
        const user = await findUserByEmail(this.state.pool, email);
        if (!user) {
            throw new PGBloomAuthError("Invalid email or password");
        }
        // Verify password
        // Need to get password hash from database
        const result = await this.state.pool.query(`SELECT password_hash FROM pgbloom_users WHERE id = $1`, [user.id]);
        if (result.rows.length === 0) {
            throw new PGBloomAuthError("Invalid email or password");
        }
        const isValid = await verifyPassword(password, result.rows[0].password_hash);
        if (!isValid) {
            throw new PGBloomAuthError("Invalid email or password");
        }
        // Generate tokens
        const accessToken = createAccessToken({ userId: user.id, email: user.email }, { jwtSecret: this.state.jwtSecret, accessTokenExpiry: this.state.accessTokenExpiry });
        const refreshToken = createRefreshToken({ userId: user.id, email: user.email }, { jwtSecret: this.state.jwtSecret, refreshTokenExpiry: this.state.refreshTokenExpiry });
        // Create session
        await createSession(this.state.pool, user.id, refreshToken);
        return {
            user,
            accessToken,
            refreshToken,
            expiresIn: parseExpiry(this.state.accessTokenExpiry),
        };
    }
    /**
     * Logs out a user (revokes refresh token).
     */
    async logout(refreshToken) {
        const refreshTokenHash = await hashRefreshToken(refreshToken);
        const session = await findSessionByRefreshTokenHash(this.state.pool, refreshTokenHash);
        if (session) {
            await revokeSession(this.state.pool, session.id);
        }
    }
    /**
     * Refreshes an access token using a refresh token.
     */
    async refreshToken(refreshToken) {
        const refreshTokenHash = await hashRefreshToken(refreshToken);
        const session = await findSessionByRefreshTokenHash(this.state.pool, refreshTokenHash);
        if (!session) {
            throw new PGBloomAuthError("Invalid or expired refresh token");
        }
        if (session.revokedAt) {
            throw new PGBloomAuthError("Token has been revoked");
        }
        if (new Date(session.expiresAt) < new Date()) {
            throw new PGBloomAuthError("Refresh token has expired");
        }
        // Get user
        const user = await findUserById(this.state.pool, session.userId);
        if (!user) {
            throw new PGBloomAuthError("User not found");
        }
        // Generate new tokens (token rotation)
        const newAccessToken = createAccessToken({ userId: user.id, email: user.email }, { jwtSecret: this.state.jwtSecret, accessTokenExpiry: this.state.accessTokenExpiry });
        const newRefreshToken = createRefreshToken({ userId: user.id, email: user.email }, { jwtSecret: this.state.jwtSecret, refreshTokenExpiry: this.state.refreshTokenExpiry });
        // Revoke old session and create new one
        await revokeSession(this.state.pool, session.id);
        await createSession(this.state.pool, user.id, newRefreshToken);
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
    /**
     * Verifies an access token and returns the payload.
     */
    async verifyToken(token) {
        return verifyToken(token, {
            jwtSecret: this.state.jwtSecret,
            accessTokenExpiry: this.state.accessTokenExpiry,
            refreshTokenExpiry: this.state.refreshTokenExpiry,
        });
    }
    /**
     * Gets the current user from an access token.
     */
    async me(accessToken) {
        const payload = await this.verifyToken(accessToken);
        if (!payload || payload.type !== "access") {
            return null;
        }
        return findUserById(this.state.pool, payload.userId);
    }
    /**
     * Sends a password reset OTP.
     */
    async forgotPassword(input) {
        const { email } = input;
        const user = await findUserByEmail(this.state.pool, email);
        // Don't reveal if user exists or not (security)
        // Always send OTP if user exists
        if (user) {
            await sendOTP(this.state, email, "forgot-password", user.id);
        }
    }
    /**
     * Resets password using OTP.
     */
    async resetPassword(input) {
        const { email, otp, newPassword } = input;
        // Verify OTP
        const result = await verifyOTP(this.state, email, otp, "forgot-password");
        if (!result.valid) {
            throw new PGBloomOTPError("Invalid or expired OTP");
        }
        // Hash new password
        const passwordHash = await hashPassword(newPassword, this.state.argon2Options);
        // Update password
        if (result.userId) {
            await updateUserPassword(this.state.pool, result.userId, passwordHash);
            // Revoke all sessions for security
            await revokeAllUserSessions(this.state.pool, result.userId);
        }
    }
    /**
     * Sends an email verification OTP.
     */
    async sendVerificationOTP(email) {
        const user = await findUserByEmail(this.state.pool, email);
        if (user) {
            await sendOTP(this.state, email, "email-verification", user.id);
        }
    }
    /**
     * Verifies email using OTP.
     */
    async verifyEmail(input) {
        const { email, otp } = input;
        const result = await verifyOTP(this.state, email, otp, "email-verification");
        if (!result.valid) {
            throw new PGBloomOTPError("Invalid or expired OTP");
        }
        if (result.userId) {
            await setUserEmailVerified(this.state.pool, result.userId);
        }
    }
    /**
     * Sends an OTP for login (passwordless login).
     */
    async sendLoginOTP(email) {
        const user = await findUserByEmail(this.state.pool, email);
        if (!user) {
            throw new PGBloomAuthError("User not found");
        }
        return sendOTP(this.state, email, "login", user.id);
    }
    /**
     * Verifies a login OTP and returns tokens.
     */
    async verifyLoginOTP(input) {
        const { email, otp } = input;
        const result = await verifyOTP(this.state, email, otp, "login");
        if (!result.valid) {
            throw new PGBloomOTPError("Invalid or expired OTP");
        }
        if (!result.userId) {
            throw new PGBloomOTPError("Invalid OTP");
        }
        const user = await findUserById(this.state.pool, result.userId);
        if (!user) {
            throw new PGBloomAuthError("User not found");
        }
        // Generate tokens
        const accessToken = createAccessToken({ userId: user.id, email: user.email }, { jwtSecret: this.state.jwtSecret, accessTokenExpiry: this.state.accessTokenExpiry });
        const refreshToken = createRefreshToken({ userId: user.id, email: user.email }, { jwtSecret: this.state.jwtSecret, refreshTokenExpiry: this.state.refreshTokenExpiry });
        // Create session
        await createSession(this.state.pool, user.id, refreshToken);
        return {
            user,
            accessToken,
            refreshToken,
            expiresIn: parseExpiry(this.state.accessTokenExpiry),
        };
    }
    /**
     * Cleans up expired sessions and OTPs.
     */
    async cleanup() {
        const [sessions, otps] = await Promise.all([
            cleanupExpiredSessions(this.state.pool),
            cleanupExpiredOTPs(this.state),
        ]);
        return { sessions, otps };
    }
}
/**
 * Factory function to create Auth instance.
 */
export function createAuth(pool, localStore, options = {}) {
    const state = createAuthState(pool, localStore, options);
    return new Auth(state);
}
//# sourceMappingURL=index.js.map