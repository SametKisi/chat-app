import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmailNotification = async (toEmail: string, senderName: string, messageText: string) => {
    try {
        await transporter.sendMail({
            from: `"SaChat" <${process.env.SMTP_EMAIL}>`,
            to: toEmail,
            subject: `💬 ${senderName} size yeni bir mesaj gönderdi!`,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #0F3040; padding: 25px; border-radius: 12px; color: #ffffff; max-width: 500px; margin: auto;">
                    <h2 style="color: #00a884;">Yeni Mesajınız Var!</h2>
                    <p><strong>${senderName}</strong> size bir mesaj gönderdi:</p>
                    <div style="background-color: #111b21; padding: 12px; border-radius: 8px; border-left: 4px solid #00a884; margin: 15px 0; color: #cbd5e1;">
                        "${messageText}"
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="https://your-site.vercel.app" style="background-color: #00a884; color: #111b21; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
                            Mesajı Gör
                        </a>
                    </div>
                </div>
            `,
        });
    } catch (error) {
        console.error("E-posta gönderim hatası:", error);
    }
};