import 'server-only'
import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import type { ResourceType } from '@prisma/client'

// ---------- contract ----------

export interface StorageProvider {
  readonly kind: 'LOCAL' | 'BLOB'
  /** Persist an uploaded buffer and return a stable storage key. */
  put(key: string, data: Buffer, mimeType: string): Promise<{ key: string }>
  /** Read the object back (local provider only; blob serves via stored URL). */
  get(key: string): Promise<Buffer>
  /** Remove the object (best-effort). */
  delete(key: string): Promise<void>
}

// ---------- validation (shared by all providers) ----------

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

export const ALLOWED_MIME: Record<string, ResourceType> = {
  'application/pdf': 'PDF',
  'image/png': 'IMAGE',
  'image/jpeg': 'IMAGE',
  'text/plain': 'DOCUMENT',
  'application/msword': 'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
}

export const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'doc', 'docx']

// Magic-byte signatures — never trust the client MIME alone.
const SIGNATURES: Array<{ mime: string; offset: number; bytes: number[] }> = [
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },          // %PDF
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },                // PNG
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },                     // JPEG
  { mime: 'application/msword', offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] },       // legacy DOC
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }, // DOCX zip
]

export function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

/** Returns an error string when invalid, or null when the upload is acceptable. */
export function validateUpload(fileName: string, mimeType: string, size: number, head: Buffer): string | null {
  const ext = extensionOf(fileName)
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Files of type .${ext || '(none)'} are not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
  }
  if (size <= 0) return 'The file is empty.'
  if (size > MAX_UPLOAD_BYTES) return 'The file is too large (maximum 15 MB).'
  if (!ALLOWED_MIME[mimeType]) return `Files of type ${mimeType} are not allowed.`

  const isText = mimeType === 'text/plain'
  if (!isText) {
    const sig = SIGNATURES.find((s) => s.mime === mimeType)
    if (sig && head.length >= sig.bytes.length) {
      const matches = sig.bytes.every((b, i) => head[sig.offset + i] === b)
      if (!matches) return 'The file contents do not match its type.'
    }
  }
  return null
}

export function newStorageKey(userId: string, fileName: string): string {
  const ext = extensionOf(fileName)
  const rand = crypto.randomBytes(8).toString('hex')
  return `uploads/${userId}/${Date.now()}-${rand}.${ext}`
}

// ---------- local provider (development) ----------

class LocalStorageProvider implements StorageProvider {
  readonly kind = 'LOCAL' as const
  private baseDir = process.env.VERCEL ? path.join(os.tmpdir(), '.uploads') : path.join(process.cwd(), '.uploads')

  async put(key: string, data: Buffer, _mimeType: string) {
    const full = path.join(this.baseDir, key)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, data)
    return { key }
  }

  async get(key: string) {
    const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '')
    return readFile(path.join(this.baseDir, safe))
  }

  async delete(key: string) {
    await unlink(path.join(this.baseDir, key)).catch(() => {})
  }
}

// ---------- Vercel Blob provider (production) ----------

type BlobClient = typeof import('@vercel/blob')

class BlobStorageProvider implements StorageProvider {
  readonly kind = 'BLOB' as const

  private async client(): Promise<BlobClient> {
    return import('@vercel/blob')
  }

  async put(key: string, data: Buffer, mimeType: string) {
    const { put } = await this.client()
    await put(key, data, { access: 'private', contentType: mimeType })
    return { key }
  }

  async get(key: string): Promise<Buffer> {
    const { get } = await this.client()
    // New uploads are private. Fall back to provider-side public reads only for
    // legacy objects created before private storage was enabled; the caller's
    // group/uploader authorization has already been checked by the API route.
    const result = await get(key, { access: 'private' }).catch(() => null)
      ?? await get(key, { access: 'public' })
    if (!result || result.statusCode !== 200) throw new Error('Blob not found or unavailable.')
    return Buffer.from(await new Response(result.stream).arrayBuffer())
  }

  async delete(key: string) {
    const { del } = await this.client()
    await del(key).catch(() => {})
  }
}

// ---------- resolution ----------

export function getStorageProvider(): StorageProvider {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new BlobStorageProvider()
  return new LocalStorageProvider()
}
