import 'server-only'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const COOKIE_NAME = 'sg_session'
const SESSION_DAYS = 7

export type SafeUser = {
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
  /** Null = onboarding not yet completed. */
  onboardedAt: string | null
  privacy: 'PUBLIC' | 'GROUPS' | 'PRIVATE'
}

export function toSafeUser(u: {
  id: string; name: string; email: string; avatarUrl: string | null
  university: string | null; course: string | null; semester: string | null
  bio: string | null; subjects: string[]; interests: string[]
  onboardedAt: Date | null; profilePrivacy: 'PUBLIC' | 'GROUPS' | 'PRIVATE'
}): SafeUser {
  return {
    id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl,
    university: u.university, course: u.course, semester: u.semester,
    bio: u.bio, subjects: u.subjects, interests: u.interests,
    onboardedAt: u.onboardedAt?.toISOString() ?? null,
    privacy: u.profilePrivacy,
  }
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET is not configured (must be 16+ characters)')
  }
  return secret
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: '7d' })
}

export function verifySessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getSecret())
    return typeof payload === 'object' && 'sub' in payload ? String(payload.sub) : null
  } catch {
    return null
  }
}

export function sessionCookieOptions(maxAgeDays = SESSION_DAYS) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
  }
}

export async function createSessionCookie(userId: string) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, signSession(userId), sessionCookieOptions())
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.set(COOKIE_NAME, '', { ...sessionCookieOptions(0), maxAge: 0 })
}

export async function getSessionUser(): Promise<SafeUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null
  const userId = verifySessionToken(token)
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  return toSafeUser(user)
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getSessionUser()
  if (!user) throw new AuthError('Not authenticated', 401)
  return user
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}
