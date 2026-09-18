import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  university: z.string().trim().max(120).optional().or(z.literal('')),
  course: z.string().trim().max(120).optional().or(z.literal('')),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500).optional().or(z.literal('')),
  university: z.string().trim().max(120).optional().or(z.literal('')),
  course: z.string().trim().max(120).optional().or(z.literal('')),
  semester: z.string().trim().max(40).optional().or(z.literal('')),
  subjects: z.array(z.string().trim().max(40)).max(12).optional(),
  interests: z.array(z.string().trim().max(40)).max(12).optional(),
  privacy: z.enum(['PUBLIC', 'GROUPS', 'PRIVATE']).optional(),
})

export const taskCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(1000),
})

export const createGroupSchema = z.object({
  name: z.string().trim().min(3, 'Name is too short').max(80),
  description: z.string().trim().max(500).default(''),
  subject: z.string().trim().min(2).max(60).default('General'),
  university: z.string().trim().max(120).optional().or(z.literal('')),
  course: z.string().trim().max(120).optional().or(z.literal('')),
  semester: z.string().trim().max(40).optional().or(z.literal('')),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string().trim().max(30)).max(6).default([]),
})

export const updateGroupSchema = createGroupSchema.partial().extend({
  pinnedAnnouncement: z.string().trim().max(300).optional(),
})

export const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(4000),
  replyToId: z.string().cuid().optional(),
})

export const editMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
})

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(8),
})

export const taskSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  subject: z.string().trim().max(60).optional().or(z.literal('')),
  groupId: z.string().cuid().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.enum(['daily', 'weekly']).optional(),
})

export const updateTaskSchema = taskSchema.partial().extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
})

export const sessionSchema = z.object({
  groupId: z.string().cuid().nullable().optional(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  subject: z.string().trim().max(60).default('General'),
  kind: z.enum(['GROUP', 'EXAM_PREP', 'PROBLEM_SOLVING', 'REVISION', 'DISCUSSION', 'FOCUS']).default('GROUP'),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().trim().max(120).optional().or(z.literal('')),
  isOnline: z.boolean().default(false),
  maxParticipants: z.number().int().min(2).max(500).nullable().optional(),
})

export const rsvpSchema = z.object({
  status: z.enum(['GOING', 'MAYBE', 'NOT_GOING']),
})

export const eventSchema = z.object({
  groupId: z.string().cuid().nullable().optional(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  kind: z.enum(['STUDY_SESSION', 'ASSIGNMENT_DEADLINE', 'EXAM', 'PERSONAL_TASK', 'GROUP_EVENT']).default('STUDY_SESSION'),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().trim().max(120).optional().or(z.literal('')),
  reminderAt: z.string().datetime().nullable().optional(),
})

export const resourceSchema = z.object({
  groupId: z.string().cuid().nullable().optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  type: z.enum(['PDF', 'NOTE', 'LINK', 'VIDEO', 'IMAGE', 'DOCUMENT']).default('LINK'),
  url: z.string().trim().url('Enter a valid URL').max(1000),
  tags: z.array(z.string().trim().max(30)).max(8).default([]),
})

export const noteSchema = z.object({
  title: z.string().trim().min(2).max(140),
  content: z.string().max(50000).default(''),
  kind: z.enum(['LECTURE', 'EXAM', 'CHEAT_SHEET', 'PROBLEM_SOLUTION', 'REVISION']).default('LECTURE'),
  tags: z.array(z.string().trim().max(30)).max(8).default([]),
})

export const focusLogSchema = z.object({
  durationMinutes: z.number().int().min(1).max(240),
  subject: z.string().trim().max(60).optional(),
  groupId: z.string().cuid().nullable().optional(),
  tasksCompleted: z.number().int().min(0).max(50).default(0),
  startedAt: z.string().datetime().optional(),
})

export const aiChatSchema = z.object({
  conversationId: z.string().cuid().optional(),
  message: z.string().trim().min(1).max(4000),
  context: z.object({
    groupId: z.string().cuid().optional(),
    noteId: z.string().cuid().optional(),
    noteContent: z.string().max(20000).optional(),
  }).optional(),
})
