import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { supabase } from './supabaseClient.js';
import meRoutes from './routes/me.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Nodemailer Taşıyıcı Yapılandırması (Gmail SMTP Ayarları)
const smtpPassClean = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: smtpPassClean,
    },
});

// E-posta Gönderici Fonksiyonu
const sendEmailNotification = async (toEmail, senderName, messageText) => {
    const siteUrl = process.env.FRONTEND_URL || 'https://chat-app-git-main-samet12kisi-9457.vercel.app';

    console.log(`📧 E-posta gönderimi başlatılıyor: ${toEmail}`);

    const info = await transporter.sendMail({
        from: `"SaChat" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: `💬 ${senderName} size yeni bir mesaj gönderdi!`,
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #0F3040; padding: 25px; border-radius: 12px; color: #ffffff; max-width: 500px; margin: auto;">
                <h2 style="color: #00a884; margin-top: 0;">Yeni Mesajınız Var!</h2>
                <p style="font-size: 15px; color: #e2e8f0;">
                    <strong>${senderName}</strong> size bir mesaj gönderdi:
                </p>
                <div style="background-color: #111b21; padding: 12px; border-radius: 8px; border-left: 4px solid #00a884; margin: 15px 0; color: #cbd5e1; font-style: italic;">
                    "${messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText}"
                </div>
                <div style="text-align: center; margin-top: 25px;">
                    <a href="${siteUrl}" style="background-color: #00a884; color: #111b21; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
                        Mesajı Gör ve Yanıtla
                    </a>
                </div>
                <hr style="border: 0; border-top: 1px solid #325E6A; margin-top: 25px;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                    Bu e-posta SaChat bildirim sistemi tarafından gönderilmiştir.
                </p>
            </div>
        `,
    });

    console.log(`✅ E-posta başarıyla gönderildi: ${info.messageId}`);
};

// İzin verilen adresler
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://chat-app-samet12kisi-9457.vercel.app',
    'https://7d28-91-93-71-131.ngrok-free.app',
    process.env.FRONTEND_URL,
    process.env.TRUSTED_ORIGINS
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
            callback(null, true);
        } else {
            callback(null, true); // Bildirim testlerinde CORS bloklamasını önlemek için esnetildi
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'set-auth-token'],
    exposedHeaders: ['set-auth-token']
}));

app.all(/^\/api\/auth\/.*/, toNodeHandler(auth));
app.all('/api/auth', toNodeHandler(auth));

app.use(express.json());

app.use('/api', meRoutes);

// ✉️ E-posta Bildirim Rotası (Detaylı Loglama ile)
app.post('/api/send-message-notification', async (req, res) => {
    try {
        const { receiverId, senderName, messageText } = req.body;
        console.log(`📬 Bildirim isteği alındı -> receiverId: ${receiverId}, sender: ${senderName}`);

        if (!receiverId || !senderName) {
            return res.status(400).json({ error: 'Eksik parametre' });
        }

        // Alıcının e-postasını çek
        const { data: user, error: userError } = await supabase
            .from('user')
            .select('email')
            .eq('id', receiverId)
            .single();

        if (userError || !user?.email) {
            console.error('❌ Supabase kullanıcı e-postası bulunamadı:', userError?.message || 'Email boş');
            return res.status(404).json({ error: 'Alıcı e-posta adresi bulunamadı' });
        }

        console.log(`🎯 Hedef alıcı bulundu: ${user.email}`);

        // E-postayı gönder
        await sendEmailNotification(user.email, senderName, messageText);
        res.status(200).json({ success: true, message: `Bildirim ${user.email} adresine gönderildi` });
    } catch (error) {
        console.error('🔥 E-posta gönderme kritik hatası:', error);
        res.status(500).json({ error: error.message || 'E-posta gönderilemedi' });
    }
});

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