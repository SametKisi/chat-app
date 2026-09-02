import { useEffect, useRef, useState } from "react";
import { ChatsTeardrop } from "@phosphor-icons/react";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "../components/ChatHeader";
import GroupMembersPanel from "../components/GroupMembersPanel";
import MessageList from "../components/MessageList";
import MessageInputBar from "../components/MessageInputBar";
import ImagePreviewModal from "../components/ImagePreviewModal";

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

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [imageCaption, setImageCaption] = useState("");

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

                <ChatHeader
                    activeChat={activeChat}
                    isGroup={isGroup}
                    isGroupOwner={isGroupOwner}
                    memberCount={members.length}
                    onBack={() => setActiveChat(null)}
                    onToggleMembers={() => setShowMembers((s) => !s)}
                    onGroupAction={handleGroupAction}
                />

                {isGroup && showMembers && (
                    <GroupMembersPanel
                        members={members}
                        ownerId={activeChat.created_by}
                        currentUserId={currentUser?.id}
                    />
                )}

                <MessageList
                    messages={messages}
                    activeChat={activeChat}
                    isGroup={isGroup}
                    currentUserId={currentUser?.id}
                    currentUserImage={currentUser?.image}
                    onDelete={deletedMessage}
                    onRemoveLocally={removeMessageLocally}
                />

                <MessageInputBar
                    value={newMessage}
                    onChange={setNewMessage}
                    onSend={sendMessage}
                    onPickImage={handlePickImage}
                    uploadingImage={uploadingImage}
                    fileInputRef={fileInputRef}
                    onImageSelected={handleImageSelected}
                />

                {previewImageUrl && (
                    <ImagePreviewModal
                        previewImageUrl={previewImageUrl}
                        caption={imageCaption}
                        onCaptionChange={setImageCaption}
                        onCancel={cancelImageModal}
                        onConfirmSend={handleConfirmSendImage}
                    />
                )}

            </div>
        </div>
    );
};

export default MessagePage;