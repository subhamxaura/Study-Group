import { prisma } from '@/lib/prisma'
import { ok, fail, withUser } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import {
  getStorageProvider, validateUpload, newStorageKey, MAX_UPLOAD_BYTES, ALLOWED_MIME,
} from '@/lib/storage'
import type { ResourceType } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/uploads — multipart file upload -> Resource
export const POST = withUser(async (user, req) => {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return fail('Upload must be sent as multipart/form-data', 422)
  }

  const file = form.get('file')
  if (!(file instanceof File)) return fail('No file provided', 422)
  if (file.size > MAX_UPLOAD_BYTES) return fail('The file is too large (maximum 15 MB).', 413)

  const groupIdRaw = form.get('groupId')
  const groupId = typeof groupIdRaw === 'string' && groupIdRaw ? groupIdRaw : null
  if (groupId) await requireMembership(groupId, user.id)

  const title = String(form.get('title') || '').trim() || file.name
  const description = String(form.get('description') || '').trim() || null
  const tagsRaw = String(form.get('tags') || '')
  const tags = tagsRaw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8)

  const declaredMime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME[declaredMime]) {
    return fail(`Files of type ${declaredMime || 'unknown'} are not allowed.`, 415)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const head = buffer.subarray(0, 8)
  const validationError = validateUpload(file.name, declaredMime, file.size, head)
  if (validationError) return fail(validationError, 415)

  const provider = getStorageProvider()
  const key = newStorageKey(user.id, file.name)
  try {
    await provider.put(key, buffer, declaredMime)
  } catch (err) {
    console.error('[uploads] storage put failed', err)
    return fail('Could not store the file. Please try again.', 500)
  }

  const type: ResourceType = ALLOWED_MIME[declaredMime]
  const resource = await prisma.resource.create({
    data: {
      groupId,
      uploaderId: user.id,
      title,
      description,
      type,
      url: `/api/uploads/${encodeURIComponent(key)}`,
      mimeType: declaredMime,
      sizeBytes: file.size,
      storageKind: provider.kind,
      storageKey: key,
      isFile: true,
      tags,
    },
    include: { uploader: { select: { id: true, name: true, avatarUrl: true } } },
  })
  const groupName = groupId
    ? (await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }))?.name
    : null

  if (groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId, userId: { not: user.id } },
      select: { userId: true },
    })
    if (members.length) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          kind: 'RESOURCE_SHARED' as const,
          title: `New file: ${resource.title}`,
          body: `${user.name} uploaded a file${groupName ? ` in ${groupName}` : ''}.`,
          link: groupId ? `/groups/${groupId}/resources` : '/resources',
        })),
      })
    }
  }

  return ok({ resource })
})
