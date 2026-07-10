import { create } from 'zustand'

interface ChatState {
  unreadByConversation: Record<number, number>
  unreadTotal: number
  setUnreads: (convMap: Record<number, number>, total: number) => void
  clearUnreadForConversation: (convId: number) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  unreadByConversation: {},
  unreadTotal: 0,
  setUnreads: (convMap, total) => set({ unreadByConversation: convMap, unreadTotal: total }),
  clearUnreadForConversation: (convId) =>
    set((state) => ({
      unreadByConversation: { ...state.unreadByConversation, [convId]: 0 },
      unreadTotal: Math.max(0, state.unreadTotal - (state.unreadByConversation[convId] ?? 0)),
    })),
  reset: () => set({ unreadByConversation: {}, unreadTotal: 0 }),
}))
