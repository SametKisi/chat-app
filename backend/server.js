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

// 1. SMTP Şifresini Temizle (Boşlukları sil)
const smtpEmail = (process.env.SMTP_EMAIL || '').trim();
const smtpPassClean = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

console.log('--- 🔍 SMTP YAPILANDIRMA KONTROLÜ ---');
console.log(`[SMTP CONFIG] Email: ${smtpEmail ? smtpEmail : '❌ TANIMLI DEĞİL'}`);
console.log(`[SMTP CONFIG] Pass Uzunluğu: ${smtpPassClean ? smtpPassClean.length + ' karakter' : '❌ TANIMLI DEĞİL'}`);
console.log('------------------------------------');

// 2. Nodemailer Yapılandırması (Bulut sunucuları için Port 587 + STARTTLS)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
        user: smtpEmail,
        pass: smtpPassClean,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Sunucu başlarken SMTP bağlantısını doğrula
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ [SMTP BAĞLANTI HATASI] Gmail SMTP doğrulaması başarısız:', error.message);
    } else {
        console.log('✅ [SMTP BAĞLANTI BAŞARILI] Gmail SMTP sunucusuna bağlanıldı ve hazır!');
    }
});

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

// ✉️ E-POSTA BİLDİRİM ROTASI
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

        console.log(`🔍 [1/3] Supabase 'user' tablosunda aranıyor: ID = "${receiverId}"`);

        // Supabase'den alıcının e-posta adresini çek
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

        console.log(`🎯 [2/3] Alıcı Bulundu -> İsim: ${user.name}, Email: ${user.email}`);

        const siteUrl = process.env.FRONTEND_URL || 'https://chat-app-samet12kisi-9457.vercel.app';

        console.log(`🚀 [3/3] Gmail SMTP üzerinden e-posta fırlatılıyor -> Kime: ${user.email}`);

        const mailOptions = {
            from: `"SaChat Bildirim" <${smtpEmail}>`,
            to: user.email,
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
                        Bu e-posta SaChat bildirim sistemi tarafından otomatik olarak gönderilmiştir.
                    </p>
                </div>
            `,
        };

        const mailInfo = await transporter.sendMail(mailOptions);

        console.log('🎉 [BAŞARILI] E-posta alıcıya ulaştı!');
        console.log(`[INFO] MessageID: ${mailInfo.messageId}`);
        console.log(`[INFO] Response: ${mailInfo.response}`);
        console.log(`[INFO] Toplam Süre: ${Date.now() - startTime}ms`);
        console.log('================================================================\n');

        return res.status(200).json({
            success: true,
            to: user.email,
            messageId: mailInfo.messageId,
            response: mailInfo.response
        });

    } catch (error) {
        console.error('🔥 [KRİTİK HATA] E-posta gönderim işlemi çöktü:');
        console.error(error);
        console.log('================================================================\n');
        return res.status(500).json({
            error: error.message,
            stack: error.stack
        });
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