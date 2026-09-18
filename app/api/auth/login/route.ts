import { prisma } from '@/lib/prisma'
import { createSessionCookie, toSafeUser, verifyPassword } from '@/lib/auth'
import { ok, fail, withRoute, parseBody } from '@/lib/api'
import { loginSchema } from '@/lib/validation'
import { rateLimit, clientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export const POST = withRoute(async (req: Request) => {
  // Brute-force protection: 10 attempts / 5 min / IP.
  const rl = rateLimit(`login:${clientIp(req)}`, 10, 5 * 60_000)
  if (!rl.ok) return fail('Too many login attempts. Try again shortly.', 429, { retryAfter: rl.retryAfter })

  const data = await parseBody(req, loginSchema)

  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user) return fail('Invalid email or password', 401)

  const valid = await verifyPassword(data.password, user.passwordHash)
  if (!valid) return fail('Invalid email or password', 401)

  // Ensure a streak row exists (older accounts).
  await prisma.studyStreak.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })

  await createSessionCookie(user.id)
  return ok({ user: toSafeUser(user) })
})
