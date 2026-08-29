import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, SignOutIcon, UserIcon } from "@phosphor-icons/react";
import { logoutManager } from "../utils/logoutManager";
import { useSearchUsers } from "../hooks/useSearchUsers";
import { useChatStore, type ChatUser } from "../store/useChatStore";
import { useSession } from "../lib/authClient";

const SideBar = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const { users, loading } = useSearchUsers(searchTerm);
    const [isLoading, setIsLoding] = useState(false);
    const session = useSession();

    const {
        activeChat,
        setActiveChat,
        conversations,
        addConversation,
        setCurrentUser,
        fetchConversations,
        currentUser
    } = useChatStore();

    useEffect(() => {
        const sessionData = session?.data as any;
        if (sessionData?.user) {
            const u = sessionData.user;
            setCurrentUser({
                id: u.id,
                name: u.name,
                username: u.username || u.name
            });
        }
    }, [session, setCurrentUser]);

    useEffect(() => {
        if (currentUser) {
            fetchConversations();
        }
    }, [currentUser, fetchConversations]);

    const { resetStore } = useChatStore();

    const handleLogout = async () => {
        resetStore(); // Önceki oturumun state'ini sıfırla
        setIsLoding(true)
        await logoutManager.performLogout("user-initiated", "Başarıyla çıkış yapıldı.", navigate);
        setIsLoding(false)
    };

    const handleSelectUser = (user: ChatUser) => {
        setActiveChat(user);
        addConversation(user, false);
        setSearchTerm("");
    };

    return (
        <div className="w-80 flex flex-col h-full bg-[#202c33] p-3 select-none shrink-0 border-r border-[#2a3942]">
            {/* Arama Input Alanı */}
            <div className="flex flex-row items-center bg-[#111b21] px-3 py-2 rounded-xl gap-2 border border-[#2a3942] focus-within:border-[#00a884] transition">
                <MagnifyingGlassIcon className="size-5 text-gray-400 shrink-0" />
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="@kullanici veya isim ara..."
                    className="w-full bg-transparent text-gray-200 text-sm outline-none placeholder:text-gray-500"
                />
            </div>

            {/* Arama Sonuçları / Sohbet Listesi */}
            <div className="flex-1 overflow-y-auto my-3 flex flex-col gap-1.5 pr-1">
                {searchTerm.trim() !== "" ? (
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
                            {loading ? "Aranıyor..." : `Sonuçlar (${users.length})`}
                        </span>

                        {users.filter(u => u.id !== currentUser?.id).map((user) => (
                            <div
                                key={user.id}
                                onClick={() => handleSelectUser(user)}
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#2a3942] cursor-pointer transition text-gray-200"
                            >
                                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600 text-gray-300">
                                    <UserIcon size={20} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium truncate">{user.name}</span>
                                    <span className="text-xs text-[#00a884] truncate">{user.username || "@isimsiz"}</span>
                                </div>
                            </div>
                        ))}

                        {!loading && users.length === 0 && (
                            <p className="text-xs text-gray-500 text-center py-4">Kullanıcı bulunamadı.</p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {conversations.length === 0 ? (
                            <div className="text-xs text-gray-500 text-center py-10">
                                Henüz sohbet yok. Yukarıdan bir kullanıcı aratın.
                            </div>
                        ) : (
                            conversations.map((user) => {
                                const isSelected = activeChat?.id === user.id;
                                const hasUnread = (user.unreadCount || 0) > 0;

                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${isSelected
                                                ? "bg-[#2a3942] text-white"
                                                : hasUnread
                                                    ? "bg-[#00a884]/20 border border-[#00a884]/40 text-emerald-100 shadow-md animate-pulse"
                                                    : "hover:bg-[#2a3942]/60 text-gray-300"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${hasUnread ? "bg-[#00a884] text-[#111b21] border-emerald-300" : "bg-slate-700 text-gray-300 border-slate-600"
                                                }`}>
                                                <UserIcon size={18} weight={hasUnread ? "bold" : "regular"} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium truncate">{user.name}</span>
                                                <span className={`text-xs truncate ${hasUnread ? "text-emerald-300 font-semibold" : "text-[#00a884]"}`}>
                                                    {user.username}
                                                </span>
                                            </div>
                                        </div>

                                        {hasUnread && (
                                            <span className="bg-[#00a884] text-[#111b21] text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                                                {user.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Çıkış Yap */}
            <div
                onClick={handleLogout}
                className="flex text-gray-300 hover:text-red-400 text-sm font-medium items-center p-3 gap-3 cursor-pointer mt-auto rounded-xl hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
            >
                <SignOutIcon size={20} weight="bold" />
                <span>{isLoading ? 'Çıkış yapılıyor...': 'Çıkış Yap'}</span>
            </div>
        </div>
    );
};

export default SideBar;