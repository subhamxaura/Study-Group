// Shared client-facing types (server data serialized as JSON)

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type RSVPStatus = 'GOING' | 'MAYBE' | 'NOT_GOING'
export type ResourceType = 'PDF' | 'NOTE' | 'LINK' | 'VIDEO' | 'IMAGE' | 'DOCUMENT'
export type EventKind = 'STUDY_SESSION' | 'ASSIGNMENT_DEADLINE' | 'EXAM' | 'PERSONAL_TASK' | 'GROUP_EVENT'

export interface SafeUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  university: string | null
  course: string | null
  semester: string | null
  bio: string | null
  subjects: string[]
  interests: string[]
  onboardedAt: string | null
  privacy: 'PUBLIC' | 'GROUPS' | 'PRIVATE'
}

export interface SessionUser {
  user: SafeUser | null
  isLoading: boolean
}

// ---- API payload types ----

export interface GroupSummary {
  id: string
  name: string
  subject: string
  description: string
  avatarUrl: string | null
  memberCount: number
  tags?: string[]
  nextSessionAt?: string | null
  weeklyMessages?: number
  myRole?: Role | null
  unreadCount?: number
}

export interface DashboardData {
  stats: {
    activeGroups: number
    studyHoursWeek: number
    tasksCompleted: number
    streak: number
    unreadNotifications: number
    todayMinutes: number
  }
  todayPlan: { focusDoneToday: number; tasksDueToday: number; sessionsToday: number }
  todayTimeline?: Array<
    | { kind: 'task'; id: string; at: string | null; title: string; subject: string | null; groupId: string | null; groupName: string | null; priority: string; overdue: boolean }
    | { kind: 'session'; id: string; at: string; title: string; subject: string | null; groupId: string | null; groupName: string | null; location: string | null; isOnline: boolean; goingCount: number }
    | { kind: 'focus'; id: string; at: null; title: string; subject: string | null; recommendedMinutes: number }
  >
  upcoming: Array<{
    id: string
    title: string
    subject: string
    startsAt: string
    endsAt: string
    location: string | null
    isOnline: boolean
    group: { id: string; name: string } | null
    goingCount: number
    myRsvp: string | null
  }>
  groups: GroupSummary[]
  dueTasks: Array<{
    id: string
    title: string
    dueDate: string | null
    priority: 'LOW' | 'MEDIUM' | 'HIGH'
    status: TaskStatus
    group: { id: string; name: string } | null
  }>
  activity: Array<{
    kind: 'message' | 'resource'
    id: string
    actor: string
    text: string
    groupName: string
    groupId: string | null
    at: string
  }>
}

export interface DiscoverGroup {
  id: string
  name: string
  description: string
  subject: string
  university: string | null
  semester: string | null
  difficulty: string | null
  avatarUrl: string | null
  isPublic: boolean
  tags: string[]
  memberCount: number
  messageCount: number
  sessionCount: number
  resourceCount: number
  myRole: Role | null
}

// Group card in the personalized Discover sections (from /api/discover)
export interface DiscoverSectionGroup {
  id: string
  name: string
  description: string
  subject: string
  university: string | null
  semester: string | null
  difficulty: string | null
  avatarUrl: string | null
  isPublic: boolean
  tags: string[]
  memberCount: number
  joined: boolean
  weeklyMessages: number
}

export interface ChatMessage {
  id: string
  kind: 'TEXT' | 'FILE' | 'SYSTEM'
  content: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  replyTo: { id: string; content: string; user: { name: string } } | null
  user: { id: string; name: string; avatarUrl: string | null }
  reactions: Array<{ emoji: string; userId: string }>
  mentions?: Array<{ user: { id: string; name: string } }>
  replyCount?: number
  deletedAt?: string | null
}

export interface TaskItem {
  id: string
  title: string
  description: string | null
  subject: string | null
  dueDate: string | null
  priority: Priority
  status: TaskStatus
  progress: number
  isRecurring: boolean
  groupId: string | null
  group: { id: string; name: string } | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  creator: { id: string; name: string } | null
}

export interface TaskCommentItem {
  id: string
  body: string
  createdAt: string
  author: { id: string; name: string; avatarUrl: string | null }
}

export interface SessionItem {
  id: string
  title: string
  subject: string
  kind: string
  description: string | null
  startsAt: string
  endsAt: string
  location: string | null
  isOnline: boolean
  maxParticipants: number | null
  creator: { id: string; name: string; avatarUrl: string | null }
  group: { id: string; name: string } | null
  goingCount: number
  myRsvp: RSVPStatus | null
}

export interface EventItem {
  id: string
  title: string
  description: string | null
  kind: EventKind
  startsAt: string
  endsAt: string
  location: string | null
  reminderAt: string | null
  creatorId: string
  group: { id: string; name: string } | null
  creator: { id: string; name: string }
}

export interface ResourceItem {
  id: string
  title: string
  description: string | null
  type: ResourceType
  url: string
  tags: string[]
  views: number
  downloads: number
  isFile?: boolean
  sizeBytes?: number | null
  mimeType?: string | null
  createdAt: string
  uploader: { id: string; name: string; avatarUrl: string | null }
  group: { id: string; name: string } | null
  isBookmarked: boolean
  bookmarkCount: number
}

export interface NoteItem {
  id: string
  title: string
  content: string
  kind: 'LECTURE' | 'EXAM' | 'CHEAT_SHEET' | 'PROBLEM_SOLUTION' | 'REVISION'
  tags: string[]
  version: number
  updatedAt: string
  author: { id: string; name: string; avatarUrl: string | null }
}

export interface NotificationItem {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

export interface MemberItem {
  id: string
  role: Role
  joinedAt: string
  user: { id: string; name: string; avatarUrl: string | null; university: string | null }
}

export interface GroupDetail {
  id: string
  name: string
  description: string
  subject: string
  university: string | null
  semester: string | null
  difficulty: string | null
  avatarUrl: string | null
  isPublic: boolean
  tags: string[]
  pinnedAnnouncement?: string | null
  createdAt: string
  ownerId?: string
  memberCount: number
  messageCount?: number
  sessionCount?: number
  resourceCount?: number
  noteCount?: number
  members: Array<{ role: Role; joinedAt: string; user: { id: string; name: string; avatarUrl: string | null } }>
  upcomingSessions: Array<{ id: string; title: string; startsAt: string; goingCount: number }>
  recentResources: Array<{ id: string; title: string; type: string; createdAt: string; uploader: { name: string } }>
  recentMessages: Array<{ id: string; content: string; createdAt: string; user: { name: string } }>
}
