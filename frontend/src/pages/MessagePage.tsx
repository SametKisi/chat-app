import { useEffect, useRef, useState } from "react";
import { 
    PaperPlaneRightIcon, 
    UserIcon, 
    UsersThree, 
    ChatsTeardrop, 
    Prohibit, 
    ArrowLeft, 
    ImageSquare, 
    CircleNotch,
    X,
    Checks,
    Check
} from "@phosphor-icons/react";
import { useChatStore } from "../store/useChatStore";

const MessagePage = () => {
    const { 
        fetchMessages, 
        messageCache, 
        deletedMessage, 
        removeMessageLocally,
        activeChat, 
        currentUser, 
        addMessage,
        setActiveChat,
        groupMembers,
        fetchGroupMembers,
        deleteGroup,
        leaveGroup,
        sendImageWithMessage,
        uploadingImage,
        markMessagesAsSeen,
    } = useChatStore();

    const [newMessage, setNewMessage] = useState("");
    const [showMembers, setShowMembers] = useState(false);
    
    // Resim Önizleme ve Altyazı State'leri
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [imageCaption, setImageCaption] = useState("");

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeKey = activeChat ? activeChat.id : "";
    const messages = activeKey ? messageCache[activeKey] || [] : [];
    const isGroup = Boolean(activeChat?.isGroup);
    const isGroupOwner = isGroup && activeChat?.created_by === currentUser?.id;
    const members = activeChat ? groupMembers[activeChat.id] || [] : [];

    const sendMessage = () => {
        if (newMessage.trim() === "" || !activeChat) return;
        addMessage(newMessage);
        setNewMessage("");
    };

    const handlePickImage = () => {
        fileInputRef.current?.click();
    };

    const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImageFile(file);
            setPreviewImageUrl(URL.createObjectURL(file));
            setImageCaption("");
        }
        e.target.value = "";
    };

    const cancelImageModal = () => {
        if (previewImageUrl) URL.revokeObjectURL(previewImageUrl);
        setSelectedImageFile(null);
        setPreviewImageUrl(null);
        setImageCaption("");
    };

    const handleConfirmSendImage = async () => {
        if (!selectedImageFile) return;
        const file = selectedImageFile;
        const caption = imageCaption.trim();
        cancelImageModal();
        await sendImageWithMessage(file, caption);
    };

    const handleGroupAction = () => {
        if (!activeChat) return;
        if (isGroupOwner) {
            if (window.confirm(`"${activeChat.name}" grubunu silmek istediğine emin misin? Bu işlem herkesi gruptan çıkarır.`)) {
                deleteGroup(activeChat.id);
            }
        } else {
            if (window.confirm(`"${activeChat.name}" grubundan ayrılmak istediğine emin misin?`)) {
                leaveGroup(activeChat.id);
            }
        }
    };

    useEffect(() => {
        if (activeChat) {
            if (!messageCache[activeChat.id]) {
                fetchMessages(activeChat.id);
            }
            if (activeChat.isGroup) {
                fetchGroupMembers(activeChat.id);
            }
            markMessagesAsSeen(activeChat.id);
        }
        setShowMembers(false);
    }, [activeChat?.id]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!activeChat) {
        return (
            <div className="hidden md:flex flex-col h-full w-full bg-[#0F3040] items-center justify-center text-gray-400 gap-3 select-none p-4">
                <div className="w-16 h-16 rounded-full bg-[#111b21] flex items-center justify-center text-[#00a884] shadow-lg">
                    <ChatsTeardrop size={36} weight="bold" />
                </div>
                <h2 className="text-xl font-semibold text-gray-200">Sohbet veya Grup Seçin</h2>
                <p className="text-sm text-gray-400 text-center max-w-sm">
                    Mesajlaşmaya başlamak için sol menüden bir kişi veya grup seçin.
                </p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 md:relative flex flex-col h-[100dvh] w-full bg-[#0F3040] p-0 md:p-4 items-center justify-center overflow-hidden">
            <div className="w-full max-w-4xl h-full bg-[#0F3040] border-0 md:border md:border-[#111b21] rounded-none md:rounded-2xl p-3 md:p-4 flex flex-col shadow-2xl overflow-hidden justify-between relative">
                
                {/* Başlık Alanı */}
                <div className="flex items-center gap-2.5 pb-2.5 mb-1 border-b border-[#325E6A]/50 shrink-0 select-none">
                    <button 
                        type="button"
                        onClick={() => setActiveChat(null)}
                        className="md:hidden flex items-center justify-center p-2 rounded-xl text-gray-200 bg-[#111b21]/70 hover:bg-[#111b21] active:scale-90 transition shrink-0"
                    >
                        <ArrowLeft size={20} weight="bold" />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-emerald-400 shrink-0 overflow-hidden">
                        {isGroup ? (
                            <UsersThree size={22} weight="bold" />
                        ) : activeChat.image ? (
                            <img src={activeChat.image} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={20} />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-gray-100 text-sm truncate">
                            {activeChat.name}
                        </span>
                        <span className="text-xs text-emerald-400 truncate">
                            {isGroup ? "Grup Sohbeti" : activeChat.username}
                        </span>
                    </div>

                    {isGroup && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowMembers((s) => !s)}
                                className="text-[11px] md:text-xs text-gray-200 bg-[#111b21]/70 hover:bg-[#111b21] px-2 md:px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                            >
                                Üyeler ({members.length})
                            </button>
                            <button
                                type="button"
                                onClick={handleGroupAction}
                                className="text-[11px] md:text-xs text-red-300 bg-red-900/30 hover:bg-red-900/50 px-2 md:px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                            >
                                {isGroupOwner ? "Grubu Sil" : "Ayrıl"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Grup Üyeleri Paneli */}
                {isGroup && showMembers && (
                    <div className="shrink-0 mb-2 p-2.5 rounded-xl bg-[#111b21]/60 border border-[#325E6A]/40">
                        <p className="text-xs text-gray-400 mb-1.5">Grup üyeleri</p>
                        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                            {members.length === 0 && (
                                <span className="text-xs text-gray-500">Üye bulunamadı.</span>
                            )}
                            {members.map((m: any) => (
                                <div key={m.id} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                        {m.image ? (
                                            <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={12} className="text-gray-300" />
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-200 truncate">
                                        {m.name}
                                        {m.id === activeChat.created_by && (
                                            <span className="text-emerald-400"> (kurucu)</span>
                                        )}
                                        {m.id === currentUser?.id && (
                                            <span className="text-gray-500"> (sen)</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mesaj Listesi */}
                <div className="flex flex-col gap-3 w-full flex-1 overflow-y-auto mb-2 pr-1 overscroll-contain">
                    {messages.map((msg: any) => {
                        const isMe = msg.sender_id === currentUser?.id;
                        const isDeleted = msg.is_deleted;
                        const senderName = isMe ? "Sen" : (msg.sender_name || activeChat.name);
                        const senderAvatar = isMe ? currentUser?.image : (msg.sender_image || activeChat.image);

                        return (
                            <div
                                key={msg.id}
                                className={`flex p-2.5 md:p-3 rounded-2xl max-w-[85%] md:max-w-[75%] ${
                                    isMe ? 'self-end bg-blue-300' : 'bg-amber-500'
                                } ${isDeleted ? 'opacity-80' : ''}`}
                            >
                                {isMe && (
                                    <div className="text-[10px] md:text-xs text-gray-800 flex-shrink-0 mr-2 md:mr-3 mt-auto flex items-center gap-1">
                                        <span>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {/* Tikler (WhatsApp tarzı Görüldü) */}
                                        {!isGroup && !isDeleted && (
                                            msg.is_seen ? (
                                                <Checks size={15} weight="bold" className="text-blue-700" />
                                            ) : (
                                                <Check size={14} weight="bold" className="text-gray-700" />
                                            )
                                        )}

                                        {!isDeleted ? (
                                            <button
                                                onClick={() => deletedMessage(msg.id)}
                                                className="text-[10px] md:text-xs text-red-600 hover:text-red-800 cursor-pointer font-medium ml-1"
                                            >
                                                Sil
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => removeMessageLocally(msg.id)}
                                                className="text-[10px] md:text-xs text-slate-700 hover:text-red-700 underline cursor-pointer font-medium ml-1"
                                            >
                                                Kaldır
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className={`flex items-start gap-2 md:gap-3 flex-1 min-w-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800/40 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                                        {senderAvatar ? (
                                            <img src={senderAvatar} alt="Sender" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={15} className="text-gray-800" />
                                        )}
                                    </div>

                                    <div className={`flex flex-col flex-1 min-w-0 ${isMe ? 'items-end text-right' : ''}`}>
                                        <span className="font-bold text-xs md:text-sm truncate text-gray-900">
                                            {senderName}
                                        </span>

                                        {isDeleted ? (
                                            <span className="text-xs md:text-sm text-gray-700 italic flex items-center gap-1 mt-0.5">
                                                <Prohibit size={14} className="text-gray-600" />
                                                Bu mesaj silindi
                                            </span>
                                        ) : (
                                            <div className="flex flex-col gap-1 mt-0.5">
                                                {msg.image_url && (
                                                    <div className="relative max-w-[220px] md:max-w-[280px]">
                                                        <img
                                                            src={msg.image_url}
                                                            alt="Görsel"
                                                            onClick={() => !msg.isUploading && window.open(msg.image_url, "_blank")}
                                                            className={`rounded-xl w-full h-auto object-cover border border-black/10 ${
                                                                msg.isUploading ? 'opacity-60' : 'cursor-pointer'
                                                            }`}
                                                        />
                                                        {msg.isUploading && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <CircleNotch size={26} className="text-white animate-spin drop-shadow" weight="bold" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {msg.text && (
                                                    <span className="text-xs md:text-sm text-gray-800 break-words leading-relaxed text-left">
                                                        {msg.text}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!isMe && (
                                    <div className="text-[10px] md:text-xs text-gray-800 flex-shrink-0 ml-2 md:mr-3 mt-auto flex items-center gap-1">
                                        <span>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {isDeleted && (
                                            <button
                                                onClick={() => removeMessageLocally(msg.id)}
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

                {/* Mesaj Yazma Alanı */}
                <div className="flex items-center w-full bg-[#325E6A] rounded-full px-3.5 py-1 md:py-2 shrink-0 mb-safe gap-1.5">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelected}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={handlePickImage}
                        disabled={uploadingImage}
                        className="p-1 active:scale-90 transition shrink-0 disabled:opacity-40"
                    >
                        {uploadingImage ? (
                            <CircleNotch size={22} className="text-[#aba9a9] animate-spin" weight="bold" />
                        ) : (
                            <ImageSquare
                                size={22}
                                weight="fill"
                                className="text-[#aba9a9] hover:text-amber-400 active:text-amber-500 cursor-pointer transition-colors"
                            />
                        )}
                    </button>

                    <input
                        onKeyDown={(e) => { if (e.key === 'Enter') { sendMessage(); } }}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        type="text"
                        placeholder="Mesaj yaz..."
                        className="flex-1 bg-transparent outline-none text-base md:text-sm text-amber-50 placeholder:text-slate-300 py-1.5"
                    />
                    <button 
                        type="button"
                        onClick={sendMessage} 
                        className="p-1 active:scale-90 transition shrink-0"
                    >
                        <PaperPlaneRightIcon
                            size={24}
                            weight="fill"
                            className="text-[#aba9a9] hover:text-amber-400 active:text-amber-500 cursor-pointer transition-colors"
                        />
                    </button>
                </div>

                {/* WhatsApp Tarzı Resim Önizleme & Açıklama Modalı */}
                {previewImageUrl && (
                    <div className="absolute inset-0 z-50 bg-[#0c1317]/95 backdrop-blur-sm flex flex-col p-4 justify-between animate-in fade-in">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-200">Resim Gönder</span>
                            <button
                                type="button"
                                onClick={cancelImageModal}
                                className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition"
                            >
                                <X size={22} weight="bold" />
                            </button>
                        </div>

                        <div className="flex-1 flex items-center justify-center my-3 overflow-hidden">
                            <img
                                src={previewImageUrl}
                                alt="Önizleme"
                                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-[#202c33] rounded-2xl px-4 py-2">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Bir açıklama ekleyin..."
                                value={imageCaption}
                                onChange={(e) => setImageCaption(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmSendImage(); }}
                                className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-400"
                            />
                            <button
                                type="button"
                                onClick={handleConfirmSendImage}
                                className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-white transition flex items-center justify-center"
                            >
                                <PaperPlaneRightIcon size={20} weight="fill" />
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default MessagePage;