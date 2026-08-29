import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, SignOutIcon, UserIcon, UsersThree, UserPlus } from "@phosphor-icons/react";
import { logoutManager } from "../utils/logoutManager";
import { useSearchUsers } from "../hooks/useSearchUsers";
import { useChatStore, type ChatUser } from "../store/useChatStore";
import { useSession } from "../lib/authClient";
import { CreateGroupModal } from "./CreateGroupModal";
import { SidebarSkeleton } from "./SideBarSkeleton";
import { requestNotificationPermission } from "../utils/notification";
import { supabase } from "../../supabaseClient";

const SideBar = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const { users, loading: isSearching } = useSearchUsers(searchTerm);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingConversations, setIsFetchingConversations] = useState(true);
    const session = useSession();

    const {
        activeChat,
        setActiveChat,
        conversations,
        addConversation,
        setCurrentUser,
        fetchConversations,
        currentUser,
        resetStore
    } = useChatStore() as any;

    useEffect(() => {
        // Sayfa açıldığında mobil/masaüstü bildirim izni iste
        requestNotificationPermission();
    }, []);

    useEffect(() => {
        const sessionData = session?.data as any;
        if (sessionData?.user) {
            const u = sessionData.user;
            setCurrentUser({
                id: u.id,
                name: u.name,
                username: u.username || u.name,
                image: u.image || null
            });
        }
    }, [session, setCurrentUser]);

    useEffect(() => {
        if (currentUser) {
            setIsFetchingConversations(true);
            fetchConversations().finally(() => {
                setIsFetchingConversations(false);
            });

            const groupChannel = supabase
                .channel('realtime-group-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => {
                    fetchConversations();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
                    fetchConversations();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(groupChannel);
            };
        }
    }, [currentUser, fetchConversations]);

    const handleLogout = async () => {
        resetStore();
        setIsLoading(true);
        await logoutManager.performLogout("user-initiated", "Başarıyla çıkış yapıldı.", navigate);
        setIsLoading(false);
    };

    const handleSelectUser = (user: ChatUser) => {
        setActiveChat(user);
        addConversation(user, false);
        setSearchTerm("");
    };

    return (
        <>
            <CreateGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => {
                    setIsGroupModalOpen(false);
                    fetchConversations();
                }}
            />

            <div className={`w-full md:w-80 flex-col h-[100dvh] md:h-full bg-[#202c33] p-3 select-none shrink-0 border-r border-[#2a3942] ${
                activeChat ? "hidden md:flex" : "flex"
            }`}>
                {/* Arama & Grup Ekle */}
                <div className="flex items-center gap-2 shrink-0 mb-1">
                    <div className="flex-1 flex flex-row items-center bg-[#111b21] px-3 py-2 rounded-xl gap-2 border border-[#2a3942] focus-within:border-[#00a884] transition">
                        <MagnifyingGlassIcon className="size-5 text-gray-400 shrink-0" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="@kullanici veya isim..."
                            className="w-full bg-transparent text-gray-200 text-sm outline-none placeholder:text-gray-500"
                        />
                    </div>
                    <button
                        onClick={() => setIsGroupModalOpen(true)}
                        title="Yeni Grup Oluştur"
                        className="p-2.5 bg-[#111b21] border border-[#2a3942] hover:border-[#00a884] text-emerald-400 rounded-xl transition hover:bg-[#2a3942]"
                    >
                        <UserPlus size={20} weight="bold" />
                    </button>
                </div>

                {/* Sohbet / Grup Listesi */}
                <div className="flex-1 overflow-y-auto my-3 flex flex-col gap-1.5 pr-1">
                    {searchTerm.trim() !== "" ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
                                {isSearching ? "Aranıyor..." : `Sonuçlar (${users.length})`}
                            </span>

                            {isSearching ? (
                                <SidebarSkeleton />
                            ) : (
                                users.filter((u: any) => u.id !== currentUser?.id).map((user: any) => (
                                    <div
                                        key={user.id}
                                        onClick={() => handleSelectUser({ ...user, isGroup: false })}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#2a3942] cursor-pointer transition text-gray-200"
                                    >
                                        <div className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600 text-gray-300 overflow-hidden">
                                            {user.image ? (
                                                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon size={20} />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate">{user.name}</span>
                                            <span className="text-xs text-[#00a884] truncate">{user.username || "@isimsiz"}</span>
                                        </div>
                                    </div>
                                ))
                            )}

                            {!isSearching && users.length === 0 && (
                                <p className="text-xs text-gray-500 text-center py-4">Kullanıcı bulunamadı.</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {isFetchingConversations ? (
                                <SidebarSkeleton />
                            ) : conversations.length === 0 ? (
                                <div className="text-xs text-gray-500 text-center py-10">
                                    Henüz sohbet veya grup yok.
                                </div>
                            ) : (
                                conversations.map((user: any) => {
                                    const isSelected = activeChat?.id === user.id;
                                    const hasUnread = (user.unreadCount || 0) > 0;
                                    const isGroupItem = Boolean(user.isGroup);

                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => handleSelectUser(user)}
                                            className={`flex items-center justify-between p-3 md:p-2.5 rounded-xl cursor-pointer transition ${
                                                isSelected
                                                    ? "bg-[#2a3942] text-white"
                                                    : hasUnread
                                                        ? "bg-[#00a884]/20 border border-[#00a884]/40 text-emerald-100 shadow-md animate-pulse"
                                                        : "hover:bg-[#2a3942]/60 text-gray-300"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 border overflow-hidden ${
                                                    hasUnread ? "border-emerald-300" : "border-slate-600 bg-slate-700 text-gray-300"
                                                }`}>
                                                    {isGroupItem ? (
                                                        <UsersThree size={20} weight={hasUnread ? "bold" : "regular"} className="text-emerald-400" />
                                                    ) : user.image ? (
                                                        <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon size={18} weight={hasUnread ? "bold" : "regular"} />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium truncate">{user.name}</span>
                                                    <span className={`text-xs truncate ${hasUnread ? "text-emerald-300 font-semibold" : "text-[#00a884]"}`}>
                                                        {isGroupItem ? "Grup Sohbeti" : user.username}
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

                {/* Alt Kısım: Profil Kartı & Çıkış */}
                <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-[#2a3942] shrink-0">
                    {currentUser && (
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-[#111b21]/70 border border-[#2a3942]">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-emerald-400 shrink-0 overflow-hidden">
                                {currentUser.image ? (
                                    <img src={currentUser.image} alt={currentUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon size={20} weight="bold" />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-bold text-gray-200 truncate">
                                    {currentUser.name}
                                </span>
                                <span className="text-xs text-emerald-400 truncate">
                                    {currentUser.username}
                                </span>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full text-gray-300 hover:text-red-400 text-sm font-medium items-center p-2.5 gap-3 cursor-pointer rounded-xl hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
                    >
                        <SignOutIcon size={20} weight="bold" />
                        <span>{isLoading ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default SideBar;