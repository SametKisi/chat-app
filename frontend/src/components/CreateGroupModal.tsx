import { useState, useEffect } from "react";
import { X, UsersThree, Check } from "@phosphor-icons/react";
import { useChatStore } from "../store/useChatStore";
import { supabase } from "../../supabaseClient";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateGroupModal = ({ isOpen, onClose }: Props) => {
    const [groupName, setGroupName] = useState("");
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { currentUser, createGroup } = useChatStore() as any;

    useEffect(() => {
        if (!isOpen) return;

        // Tüm kayıtlı kullanıcıları listele (kendimiz hariç)
        const loadUsers = async () => {
            const { data } = await supabase
                .from("user")
                .select("id, name, username")
                .neq("id", currentUser?.id || "");
            if (data) setAllUsers(data);
        };

        loadUsers();
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    const toggleSelectUser = (id: string) => {
        setSelectedUserIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!groupName.trim()) return;
        setIsSubmitting(true);
        try {
            await createGroup(groupName.trim(), selectedUserIds);
            setGroupName("");
            setSelectedUserIds([]);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-[#202c33] border border-[#2a3942] w-full max-w-md rounded-2xl p-5 flex flex-col gap-4 text-gray-200 shadow-2xl">
                {/* Modal Başlığı */}
                <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <UsersThree size={24} weight="bold" />
                        <span>Yeni Grup Oluştur</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Grup İsmi Input */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400">Grup Adı</label>
                    <input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Örn: Proje Ekibi, Arkadaşlar..."
                        className="bg-[#111b21] px-3.5 py-2.5 rounded-xl border border-[#2a3942] text-sm outline-none focus:border-[#00a884]"
                    />
                </div>

                {/* Üye Seçim Listesi */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400">Üye Ekle ({selectedUserIds.length} seçildi)</label>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1 bg-[#111b21] p-2 rounded-xl border border-[#2a3942]">
                        {allUsers.map((u) => {
                            const isSelected = selectedUserIds.includes(u.id);
                            return (
                                <div
                                    key={u.id}
                                    onClick={() => toggleSelectUser(u.id)}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                                        isSelected ? "bg-[#00a884]/20 border border-[#00a884]/40" : "hover:bg-[#2a3942]"
                                    }`}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{u.name}</span>
                                        <span className="text-xs text-emerald-400">{u.username}</span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                        isSelected ? "bg-[#00a884] border-[#00a884] text-[#111b21]" : "border-gray-500"
                                    }`}>
                                        {isSelected && <Check size={14} weight="bold" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Butonlar */}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!groupName.trim() || isSubmitting}
                        className="bg-[#00a884] text-[#111b21] font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-50 hover:bg-[#02be96] transition"
                    >
                        {isSubmitting ? "Oluşturuluyor..." : "Grubu Başlat"}
                    </button>
                </div>
            </div>
        </div>
    );
};