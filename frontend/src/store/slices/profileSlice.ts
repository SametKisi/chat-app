import { supabase } from "../../../supabaseClient";
import { resizeImage } from "../../utils/imageResize";
import { IMAGE_BUCKET, type ChatStore } from "../types";

type Set = (fn: (state: ChatStore) => Partial<ChatStore>) => void;
type Get = () => ChatStore;

export function createProfileSlice(set: Set, get: Get) {
    return {
        updateProfileImage: async (file: File) => {
            const { currentUser } = get();
            if (!currentUser) return;

            if (!file.type.startsWith("image/")) {
                alert("Lütfen geçerli bir resim formatı seçin.");
                return;
            }

            try {
                const optimizedFile = await resizeImage(file);
                const ext = (optimizedFile.name.split(".").pop() || "jpg").toLowerCase();
                const path = `avatars/${currentUser.id}_${Date.now()}.${ext}`;

                const { error: uploadErr } = await supabase.storage
                    .from(IMAGE_BUCKET)
                    .upload(path, optimizedFile, {
                        cacheControl: "3600",
                        upsert: true,
                        contentType: optimizedFile.type || "image/jpeg",
                    });

                if (uploadErr) throw uploadErr;

                const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
                const newImageUrl = publicUrlData.publicUrl;

                const { error: dbErr } = await supabase
                    .from("user")
                    .update({ image: newImageUrl })
                    .eq("id", currentUser.id);

                if (dbErr) throw dbErr;

                const updatedUser = { ...currentUser, image: newImageUrl };
                set(() => ({ currentUser: updatedUser }));

                set((state) => {
                    const nextCache = { ...state.messageCache };
                    Object.keys(nextCache).forEach((key) => {
                        nextCache[key] = nextCache[key].map((m) =>
                            m.sender_id === currentUser.id ? { ...m, sender_image: newImageUrl } : m
                        );
                    });
                    return { messageCache: nextCache };
                });

                alert("Profil fotoğrafınız başarıyla güncellendi!");
            } catch (err: any) {
                console.error("Profil fotoğrafı güncellenemedi:", err);
                alert("Profil resmi yüklenirken bir hata oluştu: " + (err?.message || ""));
            }
        },
    };
}