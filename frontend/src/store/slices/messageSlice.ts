import { supabase } from "../../../supabaseClient";
import { sendNativeNotification } from "../../utils/notification";
import { resizeImage } from "../../utils/imageResize";
import { BACKEND_URL, IMAGE_BUCKET, MAX_IMAGE_MB, type ChatStore, type ChatUser, type Message } from "../types";

type Set = (fn: (state: ChatStore) => Partial<ChatStore>) => void;
type Get = () => ChatStore;

export function createMessageSlice(set: Set, get: Get) {
    return {
        setActiveChat: (user: ChatUser | null) => {
            set(() => ({ activeChat: user }));
            if (user) {
                get().clearUnread(user.id);
                get().markMessagesAsSeen(user.id);
                if (!get().messageCache[user.id]) {
                    get().fetchMessages(user.id);
                }
                if (user.isGroup) {
                    get().fetchGroupMembers(user.id);
                }
            }
        },

        markMessagesAsSeen: async (chatId: string) => {
            const { currentUser } = get();
            if (!currentUser || !chatId) return;

            await supabase
                .from("messages")
                .update({ is_seen: true })
                .eq("receiver_id", currentUser.id)
                .eq("sender_id", chatId)
                .eq("is_seen", false);

            set((state) => ({
                messageCache: {
                    ...state.messageCache,
                    [chatId]: (state.messageCache[chatId] || []).map((m) =>
                        m.sender_id === chatId ? { ...m, is_seen: true } : m
                    ),
                },
            }));
        },

        fetchMessages: async (targetChatId?: string | null) => {
            const { currentUser, activeChat } = get();
            if (!targetChatId || !currentUser) return;

            const isGroup = activeChat?.id === targetChatId ? Boolean(activeChat.isGroup) : false;
            let query = supabase.from("messages").select("*");

            if (isGroup) {
                query = query.eq("group_id", targetChatId);
            } else {
                query = query
                    .is("group_id", null)
                    .or(
                        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetChatId}),and(sender_id.eq.${targetChatId},receiver_id.eq.${currentUser.id})`
                    );
            }

            const { data, error } = await query.order("created_at", { ascending: true });

            if (!error && data) {
                set((state) => ({
                    messageCache: { ...state.messageCache, [targetChatId]: data as Message[] },
                }));
            }
        },

        addMessage: async (text: string) => {
            const { activeChat, currentUser, addConversation } = get();
            if (!currentUser || !activeChat) return;

            addConversation(activeChat, false);

            const isGroup = Boolean(activeChat.isGroup);
            const tempId = `temp-${Date.now()}-${Math.random()}`;

            const optimisticMsg: Message = {
                id: tempId,
                text,
                sender_id: currentUser.id,
                receiver_id: isGroup ? null : activeChat.id,
                group_id: isGroup ? activeChat.id : null,
                sender_name: currentUser.name,
                sender_image: currentUser.image || null,
                created_at: new Date().toISOString(),
                is_seen: false,
                isOptimistic: true,
            };

            set((state) => ({
                messageCache: {
                    ...state.messageCache,
                    [activeChat.id]: [...(state.messageCache[activeChat.id] || []), optimisticMsg],
                },
            }));

            const { data, error } = await supabase
                .from("messages")
                .insert([{
                    text,
                    sender_id: currentUser.id,
                    receiver_id: isGroup ? null : activeChat.id,
                    group_id: isGroup ? activeChat.id : null,
                    sender_name: currentUser.name,
                    sender_image: currentUser.image || null,
                    is_seen: false,
                }])
                .select()
                .single();

            if (!error && data) {
                set((state) => ({
                    messageCache: {
                        ...state.messageCache,
                        [activeChat.id]: (state.messageCache[activeChat.id] || []).map((m) =>
                            m.id === tempId ? (data as Message) : m
                        ),
                    },
                }));

                if (!isGroup && activeChat.id) {
                    fetch(`${BACKEND_URL}/api/send-message-notification`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            receiverId: activeChat.id,
                            senderName: currentUser.name,
                            messageText: text,
                        }),
                    }).catch(() => {});
                } else if (isGroup && activeChat.id) {
                    fetch(`${BACKEND_URL}/api/send-group-notification`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            groupId: activeChat.id,
                            senderId: currentUser.id,
                            senderName: currentUser.name,
                            groupName: activeChat.name,
                            messageText: text,
                        }),
                    }).catch(() => {});
                }
            }
        },

        sendImageWithMessage: async (file: File, captionText: string) => {
            const { activeChat, currentUser, addConversation } = get();
            if (!currentUser || !activeChat) return;

            if (!file.type.startsWith("image/")) {
                alert("Lütfen bir resim dosyası seç.");
                return;
            }
            if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
                alert(`Resim çok büyük (maks ${MAX_IMAGE_MB}MB).`);
                return;
            }

            addConversation(activeChat, false);

            const isGroup = Boolean(activeChat.isGroup);
            const targetId = activeChat.id;
            const tempId = `temp-${Date.now()}-${Math.random()}`;
            const localPreviewUrl = URL.createObjectURL(file);

            const optimisticMsg: Message = {
                id: tempId,
                text: captionText,
                image_url: localPreviewUrl,
                sender_id: currentUser.id,
                receiver_id: isGroup ? null : activeChat.id,
                group_id: isGroup ? activeChat.id : null,
                sender_name: currentUser.name,
                sender_image: currentUser.image || null,
                created_at: new Date().toISOString(),
                is_seen: false,
                isOptimistic: true,
                isUploading: true,
            };

            set((state) => ({
                messageCache: {
                    ...state.messageCache,
                    [targetId]: [...(state.messageCache[targetId] || []), optimisticMsg],
                },
                uploadingImage: true,
            }));

            try {
                const optimizedFile = await resizeImage(file);
                const ext = (optimizedFile.name.split(".").pop() || "jpg").toLowerCase();
                const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

                const { error: uploadErr } = await supabase.storage
                    .from(IMAGE_BUCKET)
                    .upload(path, optimizedFile, {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: optimizedFile.type || "image/jpeg",
                    });

                if (uploadErr) throw uploadErr;

                const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
                const imageUrl = publicUrlData.publicUrl;

                const { data, error } = await supabase
                    .from("messages")
                    .insert([{
                        text: captionText,
                        image_url: imageUrl,
                        sender_id: currentUser.id,
                        receiver_id: isGroup ? null : activeChat.id,
                        group_id: isGroup ? activeChat.id : null,
                        sender_name: currentUser.name,
                        sender_image: currentUser.image || null,
                        is_seen: false,
                    }])
                    .select()
                    .single();

                if (error) throw error;

                set((state) => ({
                    messageCache: {
                        ...state.messageCache,
                        [targetId]: (state.messageCache[targetId] || []).map((m) =>
                            m.id === tempId ? (data as Message) : m
                        ),
                    },
                    uploadingImage: false,
                }));

                URL.revokeObjectURL(localPreviewUrl);

                const notifyText = captionText ? `📷 ${captionText}` : "📷 Fotoğraf";
                if (!isGroup && activeChat.id) {
                    fetch(`${BACKEND_URL}/api/send-message-notification`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            receiverId: activeChat.id,
                            senderName: currentUser.name,
                            messageText: notifyText,
                        }),
                    }).catch(() => {});
                }
            } catch (err) {
                console.error("Resim yükleme hatası:", err);
                alert("Resim gönderilemedi.");
                set((state) => ({
                    messageCache: {
                        ...state.messageCache,
                        [targetId]: (state.messageCache[targetId] || []).filter((m) => m.id !== tempId),
                    },
                    uploadingImage: false,
                }));
                URL.revokeObjectURL(localPreviewUrl);
            }
        },

        receiveIncomingMessage: (msg: Message) => {
            const { currentUser, activeChat, addConversation, conversations, markMessagesAsSeen } = get();
            if (!currentUser) return;

            if (msg.group_id) {
                const groupId = msg.group_id;
                const isChatOpen = activeChat?.id === groupId;

                sendNativeNotification(`Grup: ${msg.sender_name || "Yeni Mesaj"}`, msg.text || "📷 Fotoğraf", msg.sender_image);

                const existingGroup = conversations.find((c) => c.id === groupId);
                if (!existingGroup) {
                    supabase
                        .from("groups")
                        .select("id, name, created_by")
                        .eq("id", groupId)
                        .single()
                        .then(({ data }) => {
                            if (data) {
                                addConversation(
                                    { id: data.id, name: data.name, username: "@grup", isGroup: true, created_by: data.created_by },
                                    !isChatOpen
                                );
                            }
                        });
                } else if (!isChatOpen) {
                    addConversation(existingGroup, true);
                }

                set((state) => {
                    const chatMsgs = state.messageCache[groupId] || [];
                    if (chatMsgs.some((m) => m.id === msg.id)) return state;
                    return { messageCache: { ...state.messageCache, [groupId]: [...chatMsgs, msg] } };
                });
                return;
            }

            if (msg.receiver_id === currentUser.id) {
                const senderId = msg.sender_id;
                const isChatOpen = activeChat?.id === senderId;

                if (isChatOpen) {
                    markMessagesAsSeen(senderId);
                } else {
                    sendNativeNotification(msg.sender_name || "Yeni Mesaj", msg.text || "📷 Fotoğraf", msg.sender_image);
                }

                const existingUser = conversations.find((c) => c.id === senderId);
                if (!existingUser) {
                    supabase
                        .from("user")
                        .select("id, name, username, image")
                        .eq("id", senderId)
                        .single()
                        .then(({ data }) => {
                            if (data) addConversation({ ...data, isGroup: false } as ChatUser, !isChatOpen);
                        });
                } else if (!isChatOpen) {
                    addConversation(existingUser, true);
                }

                set((state) => {
                    const chatMsgs = state.messageCache[senderId] || [];
                    if (chatMsgs.some((m) => m.id === msg.id)) return state;
                    return {
                        messageCache: {
                            ...state.messageCache,
                            [senderId]: [...chatMsgs, isChatOpen ? { ...msg, is_seen: true } : msg],
                        },
                    };
                });
            }
        },

        deletedMessage: async (id: string) => {
            const { activeChat } = get();
            if (!activeChat) return;

            set((state) => ({
                messageCache: {
                    ...state.messageCache,
                    [activeChat.id]: (state.messageCache[activeChat.id] || []).map((m) =>
                        m.id === id ? { ...m, text: "Bu mesaj silindi", image_url: null, is_deleted: true } : m
                    ),
                },
            }));

            await supabase.from("messages").delete().eq("id", id);
        },

        handleRemoteDelete: (id: string) => {
            set((state) => {
                const updatedCache: Record<string, Message[]> = {};
                Object.keys(state.messageCache).forEach((key) => {
                    updatedCache[key] = state.messageCache[key].map((m) =>
                        m.id === id ? { ...m, text: "Bu mesaj silindi", image_url: null, is_deleted: true } : m
                    );
                });
                return { messageCache: updatedCache };
            });
        },

        removeMessageLocally: (id: string) => {
            const { activeChat } = get();
            if (!activeChat) return;

            set((state) => ({
                messageCache: {
                    ...state.messageCache,
                    [activeChat.id]: (state.messageCache[activeChat.id] || []).filter((m) => m.id !== id),
                },
            }));
        },
    };
}