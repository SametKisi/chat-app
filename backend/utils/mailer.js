import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const gmailUser = (process.env.GMAIL_USER || process.env.SMTP_EMAIL || '').trim();
const gmailPassClean = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').replace(/\s+/g, '');

export const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
        user: gmailUser,
        pass: gmailPassClean,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

// SMTP Bağlantı Doğrulaması
transporter.verify((error) => {
    if (error) {
        console.error('❌ [SMTP BAĞLANTI HATASI] Gmail SMTP doğrulaması başarısız:', error.message);
    } else {
        console.log('✅ [SMTP BAĞLANTI BAŞARILI] Gmail SMTP sunucusuna bağlanıldı ve hazır!');
    }
});

export const sendEmailNotification = async (toEmail, senderName, messageText) => {
    const siteUrl = process.env.FRONTEND_URL || 'https://chat-app-samet12kisi-9457.vercel.app';

    console.log(`📧 Gmail SMTP ile mail gönderiliyor -> ${toEmail}`);

    const info = await transporter.sendMail({
        from: `"SaChat" <${gmailUser}>`,
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
                    Bu e-posta SaChat bildirim sistemi tarafından otomatik olarak gönderilmiştir.
                </p>
            </div>
        `,
    });

    console.log('✅ [BAŞARILI] Mail gönderildi, messageId:', info.messageId);
    return info;
};