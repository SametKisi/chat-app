import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export interface UserResult {
    id: string;
    name: string;
    username: string;
    image?: string | null;
}

export const useSearchUsers = (query: string) => {
    const [users, setUsers] = useState<UserResult[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const text = query.trim();
        // '@' işaretini temizle
        const rawText = text.replace(/^@/, "").trim();

        // Metin boşsa veya sadece tek başına '@' yazılmışsa arama yapma, listeyi sıfırla
        if (!text || rawText.length === 0) {
            setUsers([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from("user")
                    .select("id, name, username, image")
                    .or(`username.ilike.%${rawText}%,name.ilike.%${rawText}%`)
                    .limit(10);

                if (error) {
                    console.error("Supabase Arama Hatası:", error.message);
                    setUsers([]);
                } else {
                    setUsers(data || []);
                }
            } catch (err) {
                console.error("Arama hatası:", err);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    return { users, loading };
};