export interface ChatUser {
    id: string;
    name: string;
    username: string;
    image?: string | null;
    unreadCount?: number;
    isGroup?: boolean;
    created_by?: string | null;
}

export interface GroupMember {
    id: string;
    name: string;
    username: string;
    image?: string | null;
}

export interface Message {
    id: string;
    text: string;
    image_url?: string | null;
    sender_id: string;
    receiver_id: string | null;
    group_id?: string | null;
    sender_name?: string | null;
    sender_image?: string | null;
    created_at: string;
    is_seen?: boolean;
    is_deleted?: boolean;
    isOptimistic?: boolean;
    isUploading?: boolean;
}

export interface ChatStore {
    currentUser: ChatUser | null;
    activeChat: ChatUser | null;
    conversations: ChatUser[];
    messageCache: Record<string, Message[]>;
    groupMembers: Record<string, GroupMember[]>;
    uploadingImage: boolean;
    setCurrentUser: (user: ChatUser | null) => void;
    updateProfileImage: (file: File) => Promise<void>;
    setActiveChat: (user: ChatUser | null) => void;
    addConversation: (user: ChatUser, markUnread?: boolean) => void;
    clearUnread: (userId: string) => void;
    markMessagesAsSeen: (chatId: string) => Promise<void>;
    fetchConversations: () => Promise<void>;
    fetchMessages: (targetChatId?: string | null) => Promise<void>;
    addMessage: (text: string) => Promise<void>;
    sendImageWithMessage: (file: File, captionText: string) => Promise<void>;
    receiveIncomingMessage: (msg: Message) => void;
    deletedMessage: (id: string) => Promise<void>;
    handleRemoteDelete: (id: string) => void;
    removeMessageLocally: (id: string) => void;
    createGroup: (name: string, memberIds: string[]) => Promise<void>;
    fetchGroupMembers: (groupId: string) => Promise<void>;
    deleteGroup: (groupId: string) => Promise<void>;
    leaveGroup: (groupId: string) => Promise<void>;
    handleGroupRemoved: (groupId: string) => void;
    handleMemberRemoved: (groupId: string, userId: string) => void;
    resetStore: () => void;
}

export const IMAGE_BUCKET = "images";
export const MAX_IMAGE_MB = 10;
export const BACKEND_URL = "https://messenger-backend-lido.onrender.com";