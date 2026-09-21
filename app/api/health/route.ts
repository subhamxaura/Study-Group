import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Public deployment health probe.
 *
 * Reports ONLY: env-var presence (booleans, never values), database
 * reachability, and whether migrations finished applying. Safe to expose —
 * contains no credentials, hostnames, or user data.
 */
export async function GET() {
  const env = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    jwtSecret: Boolean(process.env.JWT_SECRET),
  }

  // AI presence only — never values. Lets ops verify StudyMate readiness.
  const ai = {
    provider: process.env.AI_PROVIDER || 'openai',
    configured: Boolean(process.env.OPENAI_API_KEY),
    modelSet: Boolean(process.env.OPENAI_MODEL),
  }

  let db: 'up' | 'down' = 'down'
  let migrations: 'applied' | 'pending' | 'unknown' = 'unknown'

  try {
    await prisma.$queryRaw`SELECT 1`
    db = 'up'
    try {
      const rows = await prisma.$queryRaw<{ pending: bigint }[]>`
        SELECT COUNT(*)::bigint AS pending
        FROM _prisma_migrations
        WHERE finished_at IS NULL AND rolled_back_at IS NULL
      `
      migrations = Number(rows[0]?.pending ?? 0) > 0 ? 'pending' : 'applied'
    } catch {
      // _prisma_migrations missing = never migrated.
      migrations = 'pending'
    }
  } catch {
    db = 'down'
  }

  const healthy = db === 'up' && env.databaseUrl && env.jwtSecret
  return NextResponse.json(
    { ok: healthy, db, migrations, env, ai },
    { status: healthy ? 200 : 503 },
  )
}
