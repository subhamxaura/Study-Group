import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Group, Message, Event, Resource, GroupMember } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,
      setAuth: (user, token) => set({ user, token, isLoading: false }),
      clearAuth: () => set({ user: null, token: null, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

interface GroupState {
  groups: Group[]
  currentGroup: Group | null
  members: GroupMember[]
  isLoading: boolean
  setGroups: (groups: Group[]) => void
  addGroup: (group: Group) => void
  updateGroup: (group: Group) => void
  removeGroup: (groupId: string) => void
  setCurrentGroup: (group: Group | null) => void
  setMembers: (members: GroupMember[]) => void
  addMember: (member: GroupMember) => void
  removeMember: (userId: string) => void
  setLoading: (loading: boolean) => void
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set) => ({
      groups: [],
      currentGroup: null,
      members: [],
      isLoading: false,
      setGroups: (groups) => set({ groups }),
      addGroup: (group) => set((state) => ({ groups: [group, ...state.groups], currentGroup: group })),
      updateGroup: (updatedGroup) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)),
          currentGroup: state.currentGroup?.id === updatedGroup.id ? updatedGroup : state.currentGroup,
        })),
      removeGroup: (groupId) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== groupId),
          currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
        })),
      setCurrentGroup: (group) => set({ currentGroup: group }),
      setMembers: (members) => set({ members }),
      addMember: (member) =>
        set((state) => ({
          members: [...state.members, member],
          currentGroup: state.currentGroup
            ? { ...state.currentGroup, members: [...state.currentGroup.members, member] }
            : null,
        })),
      removeMember: (userId) =>
        set((state) => ({
          members: state.members.filter((m) => m.userId !== userId),
          currentGroup: state.currentGroup
            ? { ...state.currentGroup, members: state.currentGroup.members.filter((m) => m.userId !== userId) }
            : null,
        })),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'group-storage',
      partialize: (state) => ({ groups: state.groups, currentGroup: state.currentGroup }),
    }
  )
)

interface ChatState {
  messages: Message[]
  isConnected: boolean
  typingUsers: Set<string>
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, content: string) => void
  removeMessage: (messageId: string) => void
  setConnected: (connected: boolean) => void
  setTyping: (userId: string, isTyping: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isConnected: false,
  typingUsers: new Set(),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    })),
  updateMessage: (messageId, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content, updatedAt: new Date().toISOString() } : m
      ),
    })),
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),
  setConnected: (connected) => set({ isConnected: connected }),
  setTyping: (userId, isTyping) =>
    set((state) => {
      const newTyping = new Set(state.typingUsers)
      if (isTyping) newTyping.add(userId)
      else newTyping.delete(userId)
      return { typingUsers: newTyping }
    }),
}))

interface CalendarState {
  events: Event[]
  selectedDate: Date
  viewMode: 'month' | 'week' | 'day'
  setEvents: (events: Event[]) => void
  addEvent: (event: Event) => void
  updateEvent: (event: Event) => void
  removeEvent: (eventId: string) => void
  setSelectedDate: (date: Date) => void
  setViewMode: (mode: 'month' | 'week' | 'day') => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  selectedDate: new Date(),
  viewMode: 'month',
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (event) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    })),
  removeEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
    })),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
}))

interface ResourceState {
  resources: Resource[]
  isLoading: boolean
  setResources: (resources: Resource[]) => void
  addResource: (resource: Resource) => void
  updateResource: (resource: Resource) => void
  removeResource: (resourceId: string) => void
  setLoading: (loading: boolean) => void
}

export const useResourceStore = create<ResourceState>((set) => ({
  resources: [],
  isLoading: false,
  setResources: (resources) => set({ resources }),
  addResource: (resource) => set((state) => ({ resources: [resource, ...state.resources] })),
  updateResource: (resource) =>
    set((state) => ({
      resources: state.resources.map((r) => (r.id === resource.id ? resource : r)),
    })),
  removeResource: (resourceId) =>
    set((state) => ({
      resources: state.resources.filter((r) => r.id !== resourceId),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
}))

interface UIState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  theme: 'dark' | 'light'
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapsed: () => void
  setTheme: (theme: 'dark' | 'light') => void
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'light',
      toasts: [],
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      addToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).slice(2) }],
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed, theme: state.theme }),
    }
  )
)