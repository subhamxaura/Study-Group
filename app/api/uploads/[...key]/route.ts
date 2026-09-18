import { prisma } from '@/lib/prisma'
import { fail, withUser } from '@/lib/api'
import { getStorageProvider } from '@/lib/storage'

export const dynamic = 'force-dynamic'

type Ctx = { params: { key: string[] } }

// GET /api/uploads/<key...> — authorization-gated file serving (local provider)
export const GET = withUser(async (user, _req, ctx: Ctx) => {
  let key = ''
  try {
    key = ctx.params.key.map(decodeURIComponent).join('/')
  } catch {
    return fail('Not found', 404) // malformed percent-encoding
  }
  if (!key.startsWith('uploads/') || key.includes('..') || key.includes('\\')) return fail('Not found', 404)

  const resource = await prisma.resource.findFirst({
    where: { storageKey: key, isFile: true },
    select: { id: true, mimeType: true, title: true, groupId: true, storageKind: true },
  })
  if (!resource) return fail('Not found', 404)
  if (resource.groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: resource.groupId, userId: user.id } },
      select: { id: true },
    })
    if (!member) return fail('You do not have access to this file', 403)
  }
  if (resource.storageKind === 'BLOB') {
    return fail('This file is served directly from object storage', 409)
  }

  try {
    const provider = getStorageProvider()
    const data = await provider.get(key)
    const body = new Uint8Array(data)
    return new Response(body, {
      headers: {
        'Content-Type': resource.mimeType || 'application/octet-stream',
        'Content-Length': String(data.length),
        'Content-Disposition': `inline; filename="${encodeURIComponent(resource.title)}"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return fail('File not found in storage', 404)
  }
})
