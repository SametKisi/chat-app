import { useEffect, useRef, useState } from "react";
import ProfileLogo from "../constant/profilLogo.tsx";
import { PaperPlaneRightIcon, UserIcon, ChatsTeardrop, Prohibit } from "@phosphor-icons/react";
import { useChatStore } from "../store/useChatStore.ts";
import { supabase } from '../../supabaseClient';

const MessagePage = () => {
    const { 
        fetchMessages, 
        messageCache, 
        deletedMessage, 
        handleRemoteDelete,
        removeMessageLocally, // 👈 Sadece benden sil
        activeChat, 
        currentUser, 
        addMessage,
        receiveIncomingMessage
    } = useChatStore();

    const [newMessage, setNewMessage] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeKey = activeChat ? activeChat.id : "";
    const messages = activeKey ? messageCache[activeKey] || [] : [];

    const sendMessage = () => {
        if (newMessage.trim() === "" || !activeChat) return;
        addMessage(newMessage);
        setNewMessage("");
    };

    useEffect(() => {
        if (activeChat && !messageCache[activeChat.id]) {
            fetchMessages(activeChat.id);
        }

        const channel = supabase
            .channel('realtime-messages-sync')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const msg = payload.new as any;
                    if (msg.sender_id !== currentUser?.id) {
                        receiveIncomingMessage(msg);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'messages' },
                (payload) => {
                    handleRemoteDelete(payload.old.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChat, currentUser, fetchMessages, receiveIncomingMessage, handleRemoteDelete, activeKey, messageCache]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!activeChat) {
        return (
            <div className="flex flex-col h-full w-full bg-[#0F3040] items-center justify-center text-gray-400 gap-3 select-none">
                <div className="w-16 h-16 rounded-full bg-[#111b21] flex items-center justify-center text-[#00a884] shadow-lg">
                    <ChatsTeardrop size={36} weight="bold" />
                </div>
                <h2 className="text-xl font-semibold text-gray-200">Sohbet Seçin</h2>
                <p className="text-sm text-gray-400 text-center max-w-sm">
                    Mesajlaşmaya başlamak için sol menüden bir kişi seçin veya üstten kullanıcı aratın.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-[#0F3040] p-4 items-center justify-center">
            <div className="w-full max-w-4xl h-full bg-[#0F3040] border border-[#111b21] rounded-2xl p-4 flex flex-col shadow-2xl">
                
                {/* Başlık */}
                <div className="flex items-center gap-3 pb-3 mb-2 border-b border-[#325E6A]/50 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-emerald-400">
                        <UserIcon size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-100 text-sm">
                            {activeChat.name}
                        </span>
                        <span className="text-xs text-emerald-400">
                            {activeChat.username}
                        </span>
                    </div>
                </div>

                {/* Mesaj Listesi */}
                <div className="flex flex-col gap-4 w-full flex-1 overflow-y-auto mb-4 pr-2">
                    {messages.map((msg) => {
                        const isMe = msg.sender_id === currentUser?.id;
                        const isDeleted = msg.is_deleted;

                        return (
                            <div
                                key={msg.id}
                                className={`flex p-3 rounded-xl md:max-w-[75%] max-w-[85%] ${
                                    isMe ? 'self-end bg-blue-300' : 'bg-amber-500'
                                } ${isDeleted ? 'opacity-80' : ''}`}
                            >
                                {/* 1. GÖNDEREN KİŞİNİN SOL TARAFI (Saat / Silme Butonları) */}
                                {isMe && (
                                    <div className="text-xs text-gray-800 flex-shrink-0 mr-4 mt-auto flex items-center gap-1.5">
                                        <span>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {/* Mesaj silinmemişse: Herkesten Sil */}
                                        {!isDeleted ? (
                                            <button
                                                onClick={() => deletedMessage(msg.id)}
                                                className="text-xs text-red-600 hover:text-red-800 cursor-pointer font-medium"
                                            >
                                                Sil
                                            </button>
                                        ) : (
                                            /* Mesaj zaten silinmişse: Sadece benden tamamen kaldır */
                                            <button
                                                onClick={() => removeMessageLocally(msg.id)}
                                                title="Sohbetimden tamamen kaldır"
                                                className="text-xs text-slate-700 hover:text-red-700 underline cursor-pointer font-medium"
                                            >
                                                Kaldır
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* MESAJ İÇERİĞİ */}
                                <div className={`flex items-start gap-3 flex-1 min-w-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex-shrink-0 mt-1">
                                        <ProfileLogo />
                                    </div>
                                    <div className={`flex flex-col flex-1 min-w-0 ${isMe ? 'items-end text-right' : ''}`}>
                                        <span className="font-bold text-sm truncate text-gray-900">
                                            {isMe ? "Sen" : activeChat.name}
                                        </span>

                                        {isDeleted ? (
                                            <span className="text-sm text-gray-700 italic flex items-center gap-1.5 mt-0.5">
                                                <Prohibit size={15} className="text-gray-600" />
                                                Bu mesaj silindi
                                            </span>
                                        ) : (
                                            <span className="text-sm text-gray-800 break-words">
                                                {msg.text}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* 2. ALICI KİŞİNİN SAĞ TARAFI (Saat / Sadece Benden Kaldır) */}
                                {!isMe && (
                                    <div className="text-xs text-gray-800 flex-shrink-0 ml-4 mt-auto flex items-center gap-1.5">
                                        <span>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {/* Karşı taraf sildiyse ve bu mesaj silindi yazıyorsa alıcı da ekranından tamamen kaldırabilsin */}
                                        {isDeleted && (
                                            <button
                                                onClick={() => removeMessageLocally(msg.id)}
                                                title="Sohbetimden tamamen kaldır"
                                                className="text-xs text-slate-700 hover:text-red-700 underline cursor-pointer font-medium"
                                            >
                                                Kaldır
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div ref={scrollRef}></div>
                </div>

                {/* Mesaj Yazma Input Alanı */}
                <div className="flex items-center w-full bg-[#325E6A] rounded-full px-4 py-2 shrink-0">
                    <input
                        onKeyDown={(e) => { if (e.key === 'Enter') { sendMessage(); } }}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        type="text"
                        placeholder={`${activeChat.name} kullanıcısına mesaj yaz...`}
                        className="flex-1 bg-transparent outline-none text-amber-50 placeholder:text-slate-300"
                    />
                    <PaperPlaneRightIcon
                        onClick={sendMessage}
                        size={32}
                        weight="fill"
                        className="text-[#aba9a9] hover:text-amber-500 cursor-pointer transition-colors ml-2"
                    />
                </div>

            </div>
        </div>
    );
};

export default MessagePage;