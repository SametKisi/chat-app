import { createAuthClient } from 'better-auth/react';

// Canlıda Render URL'i, lokalde localhost
const backendUrl = import.meta.env.VITE_AUTH_API_URL || 'https://messenger-backend-lido.onrender.com';
const baseURL = `${backendUrl}/api/auth`;

export const TOKEN_KEY = 'bearer_token';

export const getAuthToken = () => sessionStorage.getItem(TOKEN_KEY);
export const clearAuthToken = () => sessionStorage.removeItem(TOKEN_KEY);

export const authClient = createAuthClient({
    baseURL,
    fetchOptions: {
        credentials: 'omit',
        auth: {
            type: 'Bearer',
            token: () => getAuthToken() ?? '',
        },
        onSuccess: (ctx) => {
            const token = ctx.response.headers.get('set-auth-token');
            if (token) sessionStorage.setItem(TOKEN_KEY, token);
        },
        onError: (ctx) => {
            console.error('[authClient] İstek hatası:', ctx.response?.status, ctx.error?.message);
        },
    },
});

export const { signIn, signUp, useSession, signOut } = authClient;