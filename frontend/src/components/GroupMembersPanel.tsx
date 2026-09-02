import { UserIcon } from "@phosphor-icons/react";
import type { GroupMember } from "../store/useChatStore";

interface GroupMembersPanelProps {
    members: GroupMember[];
    ownerId?: string | null;
    currentUserId?: string;
}

const GroupMembersPanel = ({ members, ownerId, currentUserId }: GroupMembersPanelProps) => {
    return (
        <div className="shrink-0 mb-2 p-2.5 rounded-xl bg-[#111b21]/60 border border-[#325E6A]/40">
            <p className="text-xs text-gray-400 mb-1.5">Grup üyeleri</p>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {members.length === 0 && (
                    <span className="text-xs text-gray-500">Üye bulunamadı.</span>
                )}
                {members.map((m) => (
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
                            {m.id === ownerId && (
                                <span className="text-emerald-400"> (kurucu)</span>
                            )}
                            {m.id === currentUserId && (
                                <span className="text-gray-500"> (sen)</span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GroupMembersPanel;
