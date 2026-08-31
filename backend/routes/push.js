import express from "express";
import { messaging } from "../lib/firebaseAdmin.js";
import { supabase } from "../supabaseClient.js";


const router = express.Router();

router.post("/push-subscribe", async (req, res) => {
    const { userId, token, platform } = req.body;
    if (!userId || !token) {
        return res.status(400).json({ hata: "userId ve token gerekli." });
    }

    const { error } = await supabase
        .from("push_tokens")
        .upsert({ user_id: userId, token, platform: platform || "web" }, { onConflict: "token" });

    if (error) {
        console.error("[push-subscribe] Hata:", error.message);
        return res.status(500).json({ hata: "Sunucu hatası." });
    }

    res.json({ success: true });
});

router.post("/push-unsubscribe", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ hata: "token gerekli." });

    await supabase.from("push_tokens").delete().eq("token", token);
    res.json({ success: true });
});

export async function sendPushToUser(userId, title, body, url = "/") {
    const { data: tokens, error } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", userId);

    if (error || !tokens?.length) return;

    const messages = tokens.map((t) => ({
        token: t.token,
        notification: { title, body },
        data: { url },
        webpush: { fcmOptions: { link: url } },
    }));

    const results = await Promise.allSettled(messages.map((m) => messaging.send(m)));

    results.forEach((r, i) => {
        if (r.status === "rejected") {
            const code = r.reason?.errorInfo?.code;
            if (code === "messaging/registration-token-not-registered") {
                supabase.from("push_tokens").delete().eq("token", messages[i].token).then();
            }
        }
    });
}

export default router;