import { create } from "zustand";
import type { ChatStore } from "./types.ts";
import { subscribeRealtime, unsubscribeRealtime } from "./realtime.ts";
import { createProfileSlice } from "./slices/profileSlice.ts";
import { createConversationSlice } from "./slices/conversationSlice.ts";
import { createGroupSlice } from "./slices/groupSlice.ts";
import { createMessageSlice } from "./slices/messageSlice.ts";

export type { ChatUser, GroupMember, Message } from "./types.ts";

export const useChatStore = create<ChatStore>((set, get) => ({
    currentUser: null,
    activeChat: null,
    conversations: [],
    messageCache: {},
    groupMembers: {},
    uploadingImage: false,

    ...createProfileSlice(set, get),
    ...createConversationSlice(set, get),
    ...createGroupSlice(set, get),
    ...createMessageSlice(set, get),

    setCurrentUser: (user) => {
        const prev = get().currentUser;
        if (prev?.id === user?.id) {
            set({ currentUser: user });
            return;
        }

        unsubscribeRealtime();
        set({ currentUser: user, activeChat: null, conversations: [], messageCache: {}, groupMembers: {} });

        if (user) {
            get().fetchConversations();
            subscribeRealtime(get, set);
        }
    },

    resetStore: () => {
        unsubscribeRealtime();
        set({ currentUser: null, activeChat: null, conversations: [], messageCache: {}, groupMembers: {} });
    },
}));