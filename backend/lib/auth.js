import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { APIError } from 'better-auth/api'; // APIError eklendi
import { pool } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

export const auth = betterAuth({
    database: pool,
    user: {
        additionalFields: {
            username: {
                type: "string",
                required: false,
                input: true,
            },
        },
    },

    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    if (user.username) {
                        const checkUser = await pool.query(
                            'SELECT id FROM "user" WHERE LOWER(username) = LOWER($1)',
                            [user.username]
                        );

                        if (checkUser.rows.length > 0) {
                            // Doğrudan Better-Auth standart hata formatında fırlatıyoruz:
                            throw new APIError("BAD_REQUEST", {
                                message: "Bu kullanıcı adı zaten alınmış.",
                            });
                        }
                    }
                    return { data: user };
                },
            },
        },
    },

    advanced: {
        defaultCookieAttributes: {
            sameSite: "lax",
            secure: false,
        },
        trustedProxyHeaders: true,
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
        enabled: true,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5174',
        'https://7d28-91-93-71-131.ngrok-free.app',
    ],
    plugins: [
        bearer(),
    ],
});