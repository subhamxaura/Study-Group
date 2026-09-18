import 'server-only'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { AuthError } from '@/lib/auth'

export type { Role }

const ROLE_RANK: Record<Role, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 }

export class ForbiddenError extends AuthError {
  constructor(message = 'You do not have permission to do that') {
    super(message, 403)
  }
}

export async function getMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
}

/** Throws 403 unless the user is a member of the group. */
export async function requireMembership(groupId: string, userId: string) {
  const m = await getMembership(groupId, userId)
  if (!m) throw new ForbiddenError('You are not a member of this group')
  return m
}

/** Throws 403 unless the user's role is at least `minRole`. */
export async function requireRole(groupId: string, userId: string, minRole: Role) {
  const m = await requireMembership(groupId, userId)
  if (ROLE_RANK[m.role] < ROLE_RANK[minRole]) {
    throw new ForbiddenError(`Requires ${minRole.toLowerCase()} role or higher`)
  }
  return m
}

export function hasRole(membership: { role: Role } | null | undefined, minRole: Role): boolean {
  if (!membership) return false
  return ROLE_RANK[membership.role] >= ROLE_RANK[minRole]
}

/** Membership context for a whole set of groups (dashboard/sidebar). */
export async function membershipsForUser(userId: string) {
  return prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true, role: true },
  })
}
