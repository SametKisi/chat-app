import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { supabase } from './supabaseClient.js';
import meRoutes from './routes/me.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// İzin verilen adresler
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://chat-app-samet12kisi-9457.vercel.app',
    'https://7d28-91-93-71-131.ngrok-free.app',
    process.env.FRONTEND_URL,
    process.env.TRUSTED_ORIGINS
].filter(Boolean);

// CORS middleware'i
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
            callback(null, true);
        } else {
            callback(new Error('CORS engellendi: ' + origin));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'set-auth-token'],
    exposedHeaders: ['set-auth-token']
}));

// Better-Auth rotaları
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

// Korumalı Kullanıcı Rotası
app.use('/api', meRoutes);

// Mesaj Rotaları
app.get('/api/messages', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) return res.status(400).json({ error: error.message });
        res.status(200).json(data);
    } catch {
        res.status(500).json({ error: 'Sunucu hatası oluştu' });
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const { text, sender } = req.body;
        const { data, error } = await supabase
            .from('messages')
            .insert([{ text, sender }])
            .select();

        if (error) return res.status(400).json({ error: error.message });
        res.status(201).json(data[0]);
    } catch {
        res.status(500).json({ error: 'Sunucu hatası oluştu' });
    }
});

app.delete('/api/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', id);

        if (error) return res.status(400).json({ error: error.message });
        res.status(200).json({ message: 'Mesaj silindi' });
    } catch {
        res.status(500).json({ error: 'Sunucu hatası oluştu' });
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla çalışıyor 🚀`);
});