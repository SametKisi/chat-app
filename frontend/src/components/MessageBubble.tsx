import { UserIcon, Prohibit, CircleNotch, Checks, Check } from "@phosphor-icons/react";
import type { ChatUser, Message } from "../store/useChatStore";

interface MessageBubbleProps {
    msg: Message;
    isMe: boolean;
    isGroup: boolean;
    activeChat: ChatUser;
    currentUserImage?: string | null;
    onDelete: (id: string) => void;
    onRemoveLocally: (id: string) => void;
}

const MessageBubble = ({
    msg,
    isMe,
    isGroup,
    activeChat,
    currentUserImage,
    onDelete,
    onRemoveLocally,
}: MessageBubbleProps) => {
    const isDeleted = msg.is_deleted;
    const senderName = isMe ? "Sen" : (msg.sender_name || activeChat.name);
    const senderAvatar = isMe ? currentUserImage : (msg.sender_image || activeChat.image);

    return (
        <div
            className={`flex p-2.5 md:p-3 rounded-2xl max-w-[85%] md:max-w-[75%] ${
                isMe ? 'self-end bg-blue-300' : 'bg-amber-500'
            } ${isDeleted ? 'opacity-80' : ''}`}
        >
            {isMe && (
                <div className="text-[10px] md:text-xs text-gray-800 flex-shrink-0 mr-2 md:mr-3 mt-auto flex items-center gap-1">
                    <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {!isGroup && !isDeleted && (
                        msg.is_seen ? (
                            <Checks size={15} weight="bold" className="text-blue-700" />
                        ) : (
                            <Check size={14} weight="bold" className="text-gray-700" />
                        )
                    )}

                    {!isDeleted ? (
                        <button
                            onClick={() => onDelete(msg.id)}
                            className="text-[10px] md:text-xs text-red-600 hover:text-red-800 cursor-pointer font-medium ml-1"
                        >
                            Sil
                        </button>
                    ) : (
                        <button
                            onClick={() => onRemoveLocally(msg.id)}
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
                                        onClick={() => !msg.isUploading && window.open(msg.image_url!, "_blank")}
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
                            onClick={() => onRemoveLocally(msg.id)}
                            className="text-[10px] md:text-xs text-slate-700 hover:text-red-700 underline cursor-pointer font-medium"
                        >
                            Kaldır
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageBubble;
