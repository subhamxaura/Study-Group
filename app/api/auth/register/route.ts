import { prisma } from '@/lib/prisma'
import { createSessionCookie, toSafeUser, hashPassword } from '@/lib/auth'
import { ok, fail, withRoute, parseBody } from '@/lib/api'
import { registerSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export const POST = withRoute(async (req: Request) => {
  const data = await parseBody(req, registerSchema)

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) return fail('An account with this email already exists', 409)

  const passwordHash = await hashPassword(data.password)
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      university: data.university || null,
      course: data.course || null,
      streak: { create: {} },
    },
  })

  await createSessionCookie(user.id)
  return ok({ user: toSafeUser(user) })
})
