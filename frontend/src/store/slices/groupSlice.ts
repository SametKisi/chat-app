import { supabase } from "../../../supabaseClient";
import type { ChatStore, ChatUser, GroupMember } from "../types";

type Set = (fn: (state: ChatStore) => Partial<ChatStore>) => void;
type Get = () => ChatStore;

function clearGroupState(state: ChatStore, groupId: string) {
    const { [groupId]: _removedCache, ...restCache } = state.messageCache;
    const { [groupId]: _removedMembers, ...restMembers } = state.groupMembers;
    return {
        conversations: state.conversations.filter((c) => c.id !== groupId),
        activeChat: state.activeChat?.id === groupId ? null : state.activeChat,
        messageCache: restCache,
        groupMembers: restMembers,
    };
}

export function createGroupSlice(set: Set, get: Get) {
    return {
        createGroup: async (name: string, memberIds: string[]) => {
            const { currentUser } = get();
            if (!currentUser) return;

            const groupId = crypto.randomUUID();
            const allMemberIds = Array.from(new Set([currentUser.id, ...memberIds]));

            const { error: groupErr } = await supabase
                .from("groups")
                .insert([{ id: groupId, name, created_by: currentUser.id }]);

            if (groupErr) {
                console.error("Grup oluşturulamadı:", groupErr);
                alert("Grup oluşturulamadı: " + groupErr.message);
                return;
            }

            const memberRows = allMemberIds.map((uid) => ({ group_id: groupId, user_id: uid }));
            await supabase.from("group_members").insert(memberRows);

            const newGroupItem: ChatUser = {
                id: groupId,
                name,
                username: "@grup",
                isGroup: true,
                unreadCount: 0,
                created_by: currentUser.id,
            };

            set((state) => ({
                conversations: [newGroupItem, ...state.conversations.filter((c) => c.id !== groupId)],
                activeChat: newGroupItem,
            }));

            get().fetchGroupMembers(groupId);
        },

        fetchGroupMembers: async (groupId: string) => {
            const { data: memberRows, error: memErr } = await supabase
                .from("group_members")
                .select("user_id")
                .eq("group_id", groupId);

            if (memErr || !memberRows || memberRows.length === 0) {
                set((state) => ({ groupMembers: { ...state.groupMembers, [groupId]: [] } }));
                return;
            }

            const userIds = Array.from(new Set(memberRows.map((m) => m.user_id)));
            const { data: users, error: usersErr } = await supabase
                .from("user")
                .select("id, name, username, image")
                .in("id", userIds);

            if (!usersErr && users) {
                set((state) => ({
                    groupMembers: { ...state.groupMembers, [groupId]: users as GroupMember[] },
                }));
            }
        },

        deleteGroup: async (groupId: string) => {
            const { currentUser, conversations } = get();
            if (!currentUser) return;

            const group = conversations.find((c) => c.id === groupId);
            if (!group || group.created_by !== currentUser.id) {
                alert("Bu grubu sadece grubu oluşturan kişi silebilir.");
                return;
            }

            await supabase.from("group_members").delete().eq("group_id", groupId);
            const { error } = await supabase.from("groups").delete().eq("id", groupId);

            if (error) {
                alert("Grup silinemedi: " + error.message);
                return;
            }

            set((state) => clearGroupState(state, groupId));
        },

        leaveGroup: async (groupId: string) => {
            const { currentUser } = get();
            if (!currentUser) return;

            const { error } = await supabase
                .from("group_members")
                .delete()
                .eq("group_id", groupId)
                .eq("user_id", currentUser.id);

            if (error) {
                alert("Gruptan ayrılamadı: " + error.message);
                return;
            }

            set((state) => clearGroupState(state, groupId));
        },

        handleGroupRemoved: (groupId: string) => {
            set((state) => clearGroupState(state, groupId));
        },

        handleMemberRemoved: (groupId: string, userId: string) => {
            const { currentUser } = get();
            if (currentUser && userId === currentUser.id) {
                set((state) => clearGroupState(state, groupId));
                return;
            }

            set((state) => ({
                groupMembers: {
                    ...state.groupMembers,
                    [groupId]: (state.groupMembers[groupId] || []).filter((m) => m.id !== userId),
                },
            }));
        },
    };
}