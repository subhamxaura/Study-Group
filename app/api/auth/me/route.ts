import { ok, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

export const GET = withUser(async (user) => ok({ user }))
