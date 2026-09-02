export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface Group {
  id: string
  name: string
  description: string
  avatar?: string
  ownerId: string
  members: GroupMember[]
  createdAt: string
  updatedAt: string
}

export interface GroupMember {
  userId: string
  groupId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  user?: User
}

export interface Message {
  id: string
  groupId: string
  userId: string
  content: string
  type: 'text' | 'file' | 'system'
  createdAt: string
  updatedAt?: string
  user?: User
}

export interface Event {
  id: string
  groupId: string
  title: string
  description: string
  startTime: string
  endTime: string
  location?: string
  isRecurring: boolean
  recurrenceRule?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  rsvps: EventRSVP[]
}

export interface EventRSVP {
  eventId: string
  userId: string
  status: 'going' | 'maybe' | 'not-going'
  createdAt: string
  user?: User
}

export interface Resource {
  id: string
  groupId: string
  name: string
  description?: string
  type: 'file' | 'link'
  url: string
  mimeType?: string
  size?: number
  category?: string
  uploadedBy: string
  createdAt: string
  updatedAt: string
  uploader?: User
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type GroupRole = 'owner' | 'admin' | 'member'
export type RSVPStatus = 'going' | 'maybe' | 'not-going'
export type ResourceType = 'file' | 'link'
export type MessageType = 'text' | 'file' | 'system'