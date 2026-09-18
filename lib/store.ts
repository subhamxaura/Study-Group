import { create } from 'zustand'
import { api } from '@/lib/client'
import type { SafeUser, ChatMessage } from '@/types'

// ---------- session ----------

interface SessionState {
  user: SafeUser | null
  isLoading: boolean
  initialized: boolean
  setUser: (user: SafeUser | null) => void
  logout: () => Promise<void>
  init: () => Promise<void>
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  isLoading: true,
  initialized: false,
  setUser: (user) => set({ user, isLoading: false, initialized: true }),
  logout: async () => {
    try { await api.post('/api/auth/logout') } catch { /* cookie already gone */ }
    set({ user: null })
  },
  init: async () => {
    try {
      const { user } = await api.get<{ user: SafeUser | null }>('/api/auth/me')
      set({ user, isLoading: false, initialized: true })
    } catch {
      set({ user: null, isLoading: false, initialized: true })
    }
  },
}))

// ---------- UI ----------

interface UIState {
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  commandOpen: boolean
  notifOpen: boolean
  studymateOpen: boolean
  toggleTheme: () => void
  setTheme: (t: 'dark' | 'light') => void
  setSidebarCollapsed: (v: boolean) => void
  setCommandOpen: (v: boolean) => void
  setNotifOpen: (v: boolean) => void
  setStudymateOpen: (v: boolean) => void
}

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('sg-theme')
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'light',
  sidebarCollapsed: false,
  commandOpen: false,
  notifOpen: false,
  studymateOpen: false,
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sg-theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
  },
  setTheme: (theme) => {
    set({ theme })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sg-theme', theme)
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  },
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setNotifOpen: (notifOpen) => set({ notifOpen }),
  setStudymateOpen: (studymateOpen) => set({ studymateOpen }),
}))

// ---------- chat (realtime state mirrored from socket) ----------

interface ChatState {
  connected: boolean
  messages: ChatMessage[]
  typing: string[]                       // userIds currently typing
  online: string[]                       // userIds online in current group
  setConnected: (v: boolean) => void
  setMessages: (m: ChatMessage[]) => void
  prependMessages: (m: ChatMessage[]) => void
  addMessage: (m: ChatMessage) => void
  /** Merge a batch of upserts by id in one pass — used by the sync poller. */
  upsertMessages: (incoming: ChatMessage[]) => void
  removeMessage: (id: string) => void
  removeMessages: (ids: string[]) => void
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void
  toggleReaction: (id: string, emoji: string, userId: string) => void
  setTyping: (userIds: string[]) => void
  setOnline: (userIds: string[]) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  connected: false,
  messages: [],
  typing: [],
  online: [],
  setConnected: (connected) => set({ connected }),
  setMessages: (messages) => set({ messages }),
  prependMessages: (older) => set((s) => ({ messages: [...older, ...s.messages] })),
  addMessage: (m) => set((s) => ({ messages: [...s.messages.filter((x) => x.id !== m.id), m] })),
  upsertMessages: (incoming) =>
    set((s) => {
      if (!incoming.length) return s
      const byId = new Map(s.messages.map((m) => [m.id, m]))
      for (const m of incoming) byId.set(m.id, m)
      // Preserve original ordering of known messages; new ones append chronologically.
      const knownIds = new Set(s.messages.map((m) => m.id))
      const kept = s.messages.map((m) => byId.get(m.id)!)
      const added = incoming.filter((m) => !knownIds.has(m.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      return { messages: [...kept, ...added] }
    }),
  updateMessage: (id, patch) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  removeMessages: (ids) =>
    set((s) => {
      if (!ids.length) return s
      const gone = new Set(ids)
      return { messages: s.messages.filter((m) => !gone.has(m.id)) }
    }),
  toggleReaction: (id, emoji, userId) =>
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== id) return m
        const existing = m.reactions.find((r) => r.emoji === emoji && r.userId === userId)
        return {
          ...m,
          reactions: existing
            ? m.reactions.filter((r) => !(r.emoji === emoji && r.userId === userId))
            : [...m.reactions, { emoji, userId }],
        }
      }),
    })),
  setTyping: (typing) => set({ typing }),
  setOnline: (online) => set({ online }),
  reset: () => set({ messages: [], typing: [], online: [], connected: false }),
}))
