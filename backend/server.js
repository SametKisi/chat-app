import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { supabase } from './supabaseClient.js';
import meRoutes from './routes/me.js';
import { sendEmailNotification } from './utils/mailer.js';
import pushRouter, { sendPushToUser } from "./routes/push.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

console.log('--- 🔍 RESEND YAPILANDIRMA KONTROLÜ ---');
console.log(`[RESEND CONFIG] API Key: ${process.env.RESEND_API_KEY ? '✅ TANIMLI' : '❌ TANIMLI DEĞİL'}`);
console.log('----------------------------------------');

// CORS Yapılandırması
app.use(cors({
    origin: (origin, callback) => {
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'set-auth-token'],
    exposedHeaders: ['set-auth-token']
}));

// Better-Auth Rotaları
app.all(/^\/api\/auth\/.*/, toNodeHandler(auth));
app.all('/api/auth', toNodeHandler(auth));

app.use(express.json());

// Gelen istek loglayıcı
app.use((req, res, next) => {
    console.log(`[GELEN İSTEK] ${req.method} -> ${req.url}`);
    next();
});

// Korumalı Kullanıcı Rotaları
app.use('/api', meRoutes);

// ✉️ E-POSTA + PUSH BİLDİRİM ROTASI
app.post('/api/send-message-notification', async (req, res) => {
    const startTime = Date.now();
    console.log('\n================== 📬 BİLDİRİM İSTEĞİ BAŞLADI ==================');
    console.log('[REQ BODY]:', JSON.stringify(req.body, null, 2));

    try {
        const { receiverId, senderName, messageText } = req.body;

        if (!receiverId || !senderName) {
            console.error('❌ [HATA]: Eksik parametre! receiverId veya senderName eksik.');
            return res.status(400).json({ error: 'Eksik parametre (receiverId veya senderName yok)' });
        }

        console.log(`🔍 [1/2] Supabase 'user' tablosunda aranıyor: ID = "${receiverId}"`);

        const { data: user, error: userError } = await supabase
            .from('user')
            .select('id, name, username, email')
            .eq('id', receiverId)
            .single();

        if (userError) {
            console.error('❌ [SUPABASE HATASI]:', userError.message);
            return res.status(404).json({ error: `Supabase hatası: ${userError.message}` });
        }

        if (!user || !user.email) {
            console.error('❌ [HATA]: Kullanıcı bulundu ancak email adresi NULL veya boş!');
            return res.status(404).json({ error: 'Alıcı bulundu ancak e-posta adresi boş.' });
        }

        console.log(`🎯 [2/2] Alıcı Bulundu -> İsim: ${user.name}, Email: ${user.email}`);

        // 📧 Mail gönderimi artık push'u bloklamıyor
        let mailInfo = null;
        try {
            console.log(`🚀 Resend ile e-posta fırlatılıyor -> Kime: ${user.email}`);
            mailInfo = await sendEmailNotification(user.email, senderName, messageText);
        } catch (mailErr) {
            console.error('⚠️ [MAIL HATASI - devam ediliyor]:', mailErr.message);
        }

        // 🔔 Push bildirimi her durumda deneniyor
        try {
            await sendPushToUser(receiverId, senderName, messageText, '/');
        } catch (pushErr) {
            console.error('⚠️ [PUSH HATASI]:', pushErr.message);
        }

        console.log(`[INFO] Toplam Süre: ${Date.now() - startTime}ms`);
        console.log('================================================================\n');

        return res.status(200).json({
            success: true,
            mailSent: !!mailInfo,
            to: user.email,
            id: mailInfo?.id ?? null
        });

    } catch (error) {
        console.error('🔥 [KRİTİK HATA] Route çöktü:');
        console.error(error);
        console.log('================================================================\n');
        return res.status(500).json({ error: error.message });
    }
});
app.use("/api", pushRouter);
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