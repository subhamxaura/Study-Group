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
  return fail('Internal server error', 500)
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
