import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { supabase } from './supabaseClient.js';
import meRoutes from './routes/me.js';
import { sendEmailNotification } from './utils/mailer.js';
import { isUserOnline } from './lib/presence.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
    origin: (origin, callback) => {
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'set-auth-token'],
    exposedHeaders: ['set-auth-token']
}));

app.all(/^\/api\/auth\/.*/, toNodeHandler(auth));
app.all('/api/auth', toNodeHandler(auth));

app.use(express.json());

app.use((req, res, next) => {
    console.log(`[GELEN İSTEK] ${req.method} -> ${req.url}`);
    next();
});

app.use('/api', meRoutes);

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

        console.log(`🔍 Supabase 'user' tablosunda aranıyor: ID = "${receiverId}"`);

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

        const receiverOnline = isUserOnline(receiverId);
        console.log(`🎯 Alıcı Bulundu -> İsim: ${user.name}, Email: ${user.email}, Online: ${receiverOnline}`);

        let mailInfo = null;
        if (!receiverOnline) {
            try {
                mailInfo = await sendEmailNotification(user.email, senderName, messageText);
            } catch (mailErr) {
                console.error('⚠️ [GMAIL API HATASI]:', mailErr.message);
            }
        } else {
            console.log(`ℹ️ [BİLGİ] Alıcı online, mail atlanıyor.`);
        }

        console.log(`[INFO] Toplam Süre: ${Date.now() - startTime}ms`);
        console.log('================================================================\n');

        return res.status(200).json({
            success: true,
            mailSent: !!mailInfo,
            receiverOnline,
            to: user.email,
            messageId: mailInfo?.messageId ?? null
        });

    } catch (error) {
        console.error('🔥 [KRİTİK HATA] Route çöktü:');
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/send-group-notification', async (req, res) => {
    const startTime = Date.now();
    console.log('\n================== 📬 GRUP BİLDİRİM İSTEĞİ BAŞLADI ==================');
    console.log('[REQ BODY]:', JSON.stringify(req.body, null, 2));

    try {
        const { groupId, senderId, senderName, groupName, messageText } = req.body;

        if (!groupId || !senderId || !senderName) {
            return res.status(400).json({ error: 'Eksik parametre (groupId, senderId veya senderName yok)' });
        }

        const { data: memberRows, error: memberErr } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId)
            .neq('user_id', senderId);

        if (memberErr) {
            console.error('❌ [SUPABASE HATASI]:', memberErr.message);
            return res.status(500).json({ error: memberErr.message });
        }

        const memberIds = (memberRows || []).map((m) => m.user_id);
        console.log(`👥 [ÜYELER] ${memberIds.length} alıcı bulundu (gönderen hariç)`);

        if (memberIds.length === 0) {
            return res.status(200).json({ success: true, notified: 0 });
        }

        const { data: users, error: userErr } = await supabase
            .from('user')
            .select('id, name, email')
            .in('id', memberIds);

        if (userErr) {
            console.error('❌ [SUPABASE HATASI]:', userErr.message);
            return res.status(500).json({ error: userErr.message });
        }

        const groupLabel = groupName || 'Grup';

        const results = await Promise.allSettled(
            (users || []).map(async (user) => {
                const online = isUserOnline(user.id);
                if (!online && user.email) {
                    try {
                        await sendEmailNotification(user.email, `${senderName} (${groupLabel})`, messageText);
                    } catch (mailErr) {
                        console.error(`⚠️ [GMAIL API HATASI] ${user.id}:`, mailErr.message);
                    }
                }
            })
        );

        console.log(`[INFO] Toplam Süre: ${Date.now() - startTime}ms`);
        console.log('================================================================\n');

        return res.status(200).json({ success: true, notified: results.length });

    } catch (error) {
        console.error('🔥 [KRİTİK HATA] Grup route çöktü:', error);
        return res.status(500).json({ error: error.message });
    }
});

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