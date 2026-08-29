import { createAuthClient } from 'better-auth/react';

// Canlıda Render URL'i, lokalde localhost (Sonunda /api/auth OLMAMALI)
const baseURL = import.meta.env.VITE_AUTH_API_URL || 'https://messenger-backend-lido.onrender.com';

export const TOKEN_KEY = 'bearer_token';

export const getAuthToken = () => sessionStorage.getItem(TOKEN_KEY);
export const clearAuthToken = () => sessionStorage.removeItem(TOKEN_KEY);

export const authClient = createAuthClient({
    baseURL, // Better-Auth /api/auth eklemesini otomatik yapar
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