import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const GET = withUser(async (user) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { onboardedAt: true, university: true, course: true, semester: true, subjects: true, goals: true },
  })
  return ok({ completed: Boolean(dbUser?.onboardedAt), draft: dbUser })
})

const schema = z.object({
  university: z.string().trim().max(120).optional().or(z.literal('')),
  course: z.string().trim().max(120).optional().or(z.literal('')),
  semester: z.string().trim().max(40).optional().or(z.literal('')),
  subjects: z.array(z.string().trim().min(1).max(40)).max(12),
  goals: z.array(z.enum(['EXAM_PREP', 'DAILY_CONSISTENCY', 'GROUP_STUDY', 'ASSIGNMENTS', 'INTERVIEW_PREP'])).max(5),
})

export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, schema)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      university: data.university || undefined,
      course: data.course || undefined,
      semester: data.semester || undefined,
      subjects: data.subjects,
      goals: data.goals,
      onboardedAt: new Date(),
    },
  })
  return ok({ completed: true })
})
