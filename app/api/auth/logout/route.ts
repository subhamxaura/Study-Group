import { clearSessionCookie } from '@/lib/auth'
import { ok, withRoute } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const POST = withRoute(async () => {
  await clearSessionCookie()
  return ok({ signedOut: true })
})
