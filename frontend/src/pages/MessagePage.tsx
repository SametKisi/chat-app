import { useEffect, useRef, useState } from "react";
import ProfileLogo from "../constant/profilLogo.tsx";
import { PaperPlaneRightIcon, UserIcon, ChatsTeardrop, Prohibit, ArrowLeft } from "@phosphor-icons/react";
import { useChatStore } from "../store/useChatStore.ts";
import { supabase } from '../../supabaseClient';

const MessagePage = () => {
    const { 
        fetchMessages, 
        messageCache, 
        deletedMessage, 
        handleRemoteDelete,
        removeMessageLocally,
        activeChat, 
        currentUser, 
        addMessage,
        receiveIncomingMessage,
        setActiveChat
    } = useChatStore() as any;

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

    // Mobilde sohbet seçili değilse boş ekran göstermek yerine gizle
    if (!activeChat) {
        return (
            <div className="hidden md:flex flex-col h-full w-full bg-[#0F3040] items-center justify-center text-gray-400 gap-3 select-none p-4">
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
        <div className="flex flex-col h-[100dvh] md:h-full w-full bg-[#0F3040] p-0 md:p-4 items-center justify-center">
            <div className="w-full max-w-4xl h-full bg-[#0F3040] border-0 md:border md:border-[#111b21] rounded-none md:rounded-2xl p-3 md:p-4 flex flex-col shadow-2xl overflow-hidden">
                
                {/* Başlık (Geri Butonu ile) */}
                <div className="flex items-center gap-2 md:gap-3 pb-3 mb-2 border-b border-[#325E6A]/50 shrink-0">
                    {/* MOBİL GERİ BUTONU */}
                    <button 
                        type="button"
                        onClick={() => setActiveChat(null)}
                        className="md:hidden flex items-center justify-center p-2 rounded-xl text-gray-200 bg-[#111b21]/70 hover:bg-[#111b21] active:scale-95 transition shrink-0"
                        title="Sohbet Listesine Dön"
                    >
                        <ArrowLeft size={20} weight="bold" />
                    </button>

                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-emerald-400 shrink-0">
                        <UserIcon size={20} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-100 text-sm truncate">
                            {activeChat.name}
                        </span>
                        <span className="text-xs text-emerald-400 truncate">
                            {activeChat.username}
                        </span>
                    </div>
                </div>

                {/* Mesaj Listesi */}
                <div className="flex flex-col gap-3 md:gap-4 w-full flex-1 overflow-y-auto mb-3 md:mb-4 pr-1 md:pr-2">
                    {messages.map((msg: any) => {
                        const isMe = msg.sender_id === currentUser?.id;
                        const isDeleted = msg.is_deleted;

                        return (
                            <div
                                key={msg.id}
                                className={`flex p-2.5 md:p-3 rounded-xl max-w-[90%] md:max-w-[75%] ${
                                    isMe ? 'self-end bg-blue-300' : 'bg-amber-500'
                                } ${isDeleted ? 'opacity-80' : ''}`}
                            >
                                {isMe && (
                                    <div className="text-[10px] md:text-xs text-gray-800 flex-shrink-0 mr-2 md:mr-4 mt-auto flex items-center gap-1">
                                        <span>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {!isDeleted ? (
                                            <button
                                                onClick={() => deletedMessage(msg.id)}
                                                className="text-[10px] md:text-xs text-red-600 hover:text-red-800 cursor-pointer font-medium"
                                            >
                                                Sil
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => removeMessageLocally(msg.id)}
                                                title="Sohbetimden tamamen kaldır"
                                                className="text-[10px] md:text-xs text-slate-700 hover:text-red-700 underline cursor-pointer font-medium"
                                            >
                                                Kaldır
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className={`flex items-start gap-2 md:gap-3 flex-1 min-w-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex-shrink-0 mt-0.5">
                                        <ProfileLogo />
                                    </div>
                                    <div className={`flex flex-col flex-1 min-w-0 ${isMe ? 'items-end text-right' : ''}`}>
                                        <span className="font-bold text-xs md:text-sm truncate text-gray-900">
                                            {isMe ? "Sen" : activeChat.name}
                                        </span>

                                        {isDeleted ? (
                                            <span className="text-xs md:text-sm text-gray-700 italic flex items-center gap-1 mt-0.5">
                                                <Prohibit size={14} className="text-gray-600" />
                                                Bu mesaj silindi
                                            </span>
                                        ) : (
                                            <span className="text-xs md:text-sm text-gray-800 break-words leading-relaxed">
                                                {msg.text}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {!isMe && (
                                    <div className="text-[10px] md:text-xs text-gray-800 flex-shrink-0 ml-2 md:mr-4 mt-auto flex items-center gap-1">
                                        <span>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {isDeleted && (
                                            <button
                                                onClick={() => removeMessageLocally(msg.id)}
                                                title="Sohbetimden tamamen kaldır"
                                                className="text-[10px] md:text-xs text-slate-700 hover:text-red-700 underline cursor-pointer font-medium"
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
                <div className="flex items-center w-full bg-[#325E6A] rounded-full px-3 md:px-4 py-1.5 md:py-2 shrink-0">
                    <input
                        onKeyDown={(e) => { if (e.key === 'Enter') { sendMessage(); } }}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        type="text"
                        placeholder={`${activeChat.name} kullanıcısına mesaj yaz...`}
                        className="flex-1 bg-transparent outline-none text-xs md:text-sm text-amber-50 placeholder:text-slate-300"
                    />
                    <button onClick={sendMessage} className="p-1">
                        <PaperPlaneRightIcon
                            size={26}
                            weight="fill"
                            className="text-[#aba9a9] hover:text-amber-500 cursor-pointer transition-colors"
                        />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default MessagePage;