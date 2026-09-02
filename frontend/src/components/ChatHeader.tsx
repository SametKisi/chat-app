import { UserIcon, UsersThree, ArrowLeft } from "@phosphor-icons/react";
import type { ChatUser } from "../store/useChatStore";

interface ChatHeaderProps {
    activeChat: ChatUser;
    isGroup: boolean;
    isGroupOwner: boolean;
    memberCount: number;
    onBack: () => void;
    onToggleMembers: () => void;
    onGroupAction: () => void;
}

const ChatHeader = ({
    activeChat,
    isGroup,
    isGroupOwner,
    memberCount,
    onBack,
    onToggleMembers,
    onGroupAction,
}: ChatHeaderProps) => {
    return (
        <div className="flex items-center gap-2.5 pb-2.5 mb-1 border-b border-[#325E6A]/50 shrink-0 select-none">
            <button
                type="button"
                onClick={onBack}
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
                        onClick={onToggleMembers}
                        className="text-[11px] md:text-xs text-gray-200 bg-[#111b21]/70 hover:bg-[#111b21] px-2 md:px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                    >
                        Üyeler ({memberCount})
                    </button>
                    <button
                        type="button"
                        onClick={onGroupAction}
                        className="text-[11px] md:text-xs text-red-300 bg-red-900/30 hover:bg-red-900/50 px-2 md:px-2.5 py-1.5 rounded-lg transition whitespace-nowrap"
                    >
                        {isGroupOwner ? "Grubu Sil" : "Ayrıl"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatHeader;
