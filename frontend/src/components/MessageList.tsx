import { useEffect, useRef } from "react";
import type { ChatUser, Message } from "../store/useChatStore";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
    messages: Message[];
    activeChat: ChatUser;
    isGroup: boolean;
    currentUserId?: string;
    currentUserImage?: string | null;
    onDelete: (id: string) => void;
    onRemoveLocally: (id: string) => void;
}

const MessageList = ({
    messages,
    activeChat,
    isGroup,
    currentUserId,
    currentUserImage,
    onDelete,
    onRemoveLocally,
}: MessageListProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex flex-col gap-3 w-full flex-1 overflow-y-auto mb-2 pr-1 overscroll-contain">
            {messages.map((msg) => (
                <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={msg.sender_id === currentUserId}
                    isGroup={isGroup}
                    activeChat={activeChat}
                    currentUserImage={currentUserImage}
                    onDelete={onDelete}
                    onRemoveLocally={onRemoveLocally}
                />
            ))}
            <div ref={scrollRef}></div>
        </div>
    );
};

export default MessageList;
