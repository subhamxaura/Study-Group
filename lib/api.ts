import { NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { getSessionUser, SafeUser, AuthError } from '@/lib/auth'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
}

/** Wraps an authenticated route handler. Signature: (req, ctx) after wrapping. */
export function withUser<C = unknown>(
  handler: (user: SafeUser, req: Request, ctx: C) => Promise<Response>,
): (req: Request, ctx: C) => Promise<Response> {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const user = await getSessionUser()
      if (!user) return fail('Not authenticated', 401)
      return await handler(user, req, ctx)
    } catch (err) {
      return handleRouteError(err)
    }
  }
}

/** Wraps an unauthenticated route (health, login, register). */
export function withRoute(
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (err) {
      return handleRouteError(err)
    }
  }
}

export function handleRouteError(err: unknown): Response {
  if (err instanceof AuthError) return fail(err.message, err.status)
  if (err instanceof ZodError) {
    const first = err.errors[0]
    return fail(first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input', 422)
  }
  console.error('[api]', err)
  if (isPrismaInitError(err)) {
    // Known deployment misconfiguration (e.g. DATABASE_URL unset / unreachable).
    // Message contains no secrets; same client response as any other 500 so we
    // never leak infrastructure details, while Vercel logs stay actionable.
    console.error(
      '[api] database unavailable — check DATABASE_URL and `prisma migrate deploy`:',
      describePrismaInitError(err),
    )
  }
  return fail('Internal server error', 500)
}

/** True when Prisma cannot reach / initialize its datasource (P1000–P1003, P1017). */
function isPrismaInitError(err: unknown): boolean {
  return (
    err instanceof Error &&
    err.name === 'PrismaClientInitializationError' &&
    typeof (err as { code?: string }).code === 'string' &&
    /^P10(00|01|02|03|17)$/.test((err as { code?: string }).code as string)
  )
}

function describePrismaInitError(err: unknown): string {
  const e = err as { code?: string }
  switch (e.code) {
    case 'P1001':
      return "P1001 can't reach database — DATABASE_URL likely missing or the host is unreachable"
    case 'P1000':
      return 'P1000 authentication failed — check the credentials in DATABASE_URL'
    case 'P1002':
      return 'P1002 database reached but timed out — server may be paused or sizing too small'
    case 'P1003':
      return 'P1003 database (or a table) does not exist — run `prisma migrate deploy`'
    case 'P1017':
      return 'P1017 server closed the connection — often serverless connection limits'
    default:
      return `Prisma init failed (${e.code ?? 'unknown code'})`
  }
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    throw new AuthError('Request body must be valid JSON', 400)
  }
  return schema.parse(json)
}
