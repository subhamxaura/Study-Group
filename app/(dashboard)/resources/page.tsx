'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookOpen, Bookmark, Search, Plus, ExternalLink, FileUp, Download, Paperclip, FileText, Film, Link2, Image as ImageIcon, File } from 'lucide-react'
import { Badge, Button, EmptyState, Input, Modal, Select, Textarea } from '@/components/ui'
import { SkeletonResourceCard } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toast'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import type { ResourceItem } from '@/types'

const TYPES = ['ALL', 'PDF', 'NOTE', 'LINK', 'VIDEO', 'IMAGE', 'DOCUMENT']

/** Recognizable icon per resource type — no more truncated text tiles. */
const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PDF: FileText,
  DOCUMENT: FileText,
  NOTE: File,
  LINK: Link2,
  VIDEO: Film,
  IMAGE: ImageIcon,
}

function formatBytes(n: number | null | undefined): string | null {
  if (!n) return null
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** XHR upload so we get real progress events (fetch can't report upload progress). */
function uploadWithProgress(
  file: File,
  fields: { title: string; description: string; groupId: string },
  onProgress: (pct: number) => void,
): Promise<ResourceItem> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    if (fields.title) form.append('title', fields.title)
    if (fields.description) form.append('description', fields.description)
    if (fields.groupId) form.append('groupId', fields.groupId)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve(body.data.resource)
        else reject(new Error(body.error || 'Upload failed'))
      } catch {
        reject(new Error('Upload failed'))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(form)
  })
}

export default function ResourcesPage() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('ALL')
  const [sort, setSort] = useState('recent')
  const [savedOnly, setSavedOnly] = useState(false)
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const searchParams = useSearchParams()
  const [myGroups, setMyGroups] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({ title: '', url: '', type: 'LINK', description: '', groupId: '' })
  const [saving, setSaving] = useState(false)
  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [upPct, setUpPct] = useState<number | null>(null)
  const [upTitle, setUpTitle] = useState('')
  const [upDesc, setUpDesc] = useState('')
  const [upGroup, setUpGroup] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ pageSize: '48' })
    if (query.trim()) params.set('q', query.trim())
    if (type !== 'ALL') params.set('type', type)
    if (sort) params.set('sort', sort)
    if (savedOnly) params.set('saved', '1')
    api.get<{ resources: ResourceItem[] }>(`/api/resources?${params}`)
      .then((d) => setResources(d.resources))
      .catch(() => toast.error('Could not load resources.'))
      .finally(() => setLoading(false))
  }, [query, type, sort, savedOnly])

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, query])

  useEffect(() => {
    api.get<{ groups: Array<{ id: string; name: string }> }>('/api/groups?mine=1&pageSize=24')
      .then((d) => setMyGroups(d.groups))
      .catch(() => {})
  }, [])
  // Deep link: /resources?create=1 opens the share panel
  useEffect(() => {
    if (searchParams.get('create') === '1') setCreateOpen(true)
  }, [searchParams])

  const toggleBookmark = async (id: string) => {
    setResources((rs) => rs.map((r) => (r.id === id ? { ...r, isBookmarked: !r.isBookmarked } : r)))
    await api.post(`/api/resources/${id}/bookmark`).catch(load)
  }

  const share = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/resources', {
        title: form.title, url: form.url, type: form.type,
        description: form.description, groupId: form.groupId || null, tags: [],
      })
      toast.success('Resource shared.')
      setCreateOpen(false)
      setForm({ title: '', url: '', type: 'LINK', description: '', groupId: '' })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not share the resource.')
    } finally {
      setSaving(false)
    }
  }

  const startUpload = async () => {
    if (!file) return
    setUpPct(0)
    try {
      const resource = await uploadWithProgress(file, { title: upTitle, description: upDesc, groupId: upGroup }, setUpPct)
      toast.success(`"${resource.title}" uploaded.`)
      resetUpload()
      setCreateOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUpPct(null)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setUpPct(null)
    setUpTitle('')
    setUpDesc('')
    setUpGroup('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="section-container space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
          <p className="mt-1 text-sm text-secondary">Shared materials across your groups.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSavedOnly((s) => !s)}
            className={cn('btn btn-sm', savedOnly ? 'btn-primary' : 'btn-secondary')}
          >
            <Bookmark className={cn('h-4 w-4', savedOnly && 'fill-current')} /> Saved
          </button>
          <button onClick={() => { setCreateOpen(true); setUpPct(null) }} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> Share</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="input pl-9"
            aria-label="Search resources"
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input w-auto py-2 text-sm" aria-label="Filter by type">
          {TYPES.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All types' : t}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto py-2 text-sm" aria-label="Sort">
          <option value="recent">Most recent</option>
          <option value="popular">Most downloaded</option>
          <option value="views">Most viewed</option>
        </select>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <SkeletonResourceCard key={i} />)}</div>
      ) : resources.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BookOpen}
            title={savedOnly ? 'No saved resources yet' : 'No resources found'}
            description={savedOnly ? 'Bookmark resources to find them here.' : 'Be the first to share something with your groups.'}
            action={savedOnly
              ? <button onClick={() => setSavedOnly(false)} className="btn btn-secondary btn-sm">Browse all</button>
              : <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">Share a resource</button>}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => {
            const size = formatBytes(r.sizeBytes)
            return (
              <div key={r.id} className="card-hover flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--sg-accent-soft))] text-[rgb(var(--sg-accent))] dark:text-[rgb(var(--sg-accent-muted))]" aria-hidden="true">
                    {(() => { const I = TYPE_ICONS[r.type] ?? File; return <I className="h-5 w-5" /> })()}
                  </span>
                  <button
                    onClick={() => toggleBookmark(r.id)}
                    className={cn('rounded-md p-1.5 transition-colors hover:bg-[rgb(var(--sg-hover))]',
                      r.isBookmarked ? 'text-amber-500' : 'text-muted')}
                    aria-label={r.isBookmarked ? `Remove bookmark from ${r.title}` : `Bookmark ${r.title}`}
                  >
                    <Bookmark className={cn('h-4 w-4', r.isBookmarked && 'fill-current')} />
                  </button>
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{r.title}</p>
                {r.description && <p className="mt-0.5 line-clamp-2 flex-1 text-xs text-secondary">{r.description}</p>}
                <Badge tone="muted" className="mt-2 w-fit">{r.type.toLowerCase()}</Badge>
                <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[10px] text-muted">
                  <span>{r.uploader.name}{r.group ? ` · ${r.group.name}` : ''}</span>
                  <span>
                    {size ? `${size} · ` : ''}{r.views} views{r.downloads > 0 ? ` · ${r.downloads} dl` : ''}
                  </span>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <a
                    href={r.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => api.patch(`/api/resources/${r.id}?track=view`).catch(() => {})}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    {r.isFile ? <Download className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    {r.isFile ? 'Download' : 'Open'}
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => { if (upPct === null || upPct === 100) { setCreateOpen(false); resetUpload() } }} title="Share a resource">
        <div className="space-y-5">
          {/* File upload */}
          <div className="rounded-xl border border-dashed p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><FileUp className="h-4 w-4 text-muted" /> Upload a file</p>
            <p className="mt-1 text-xs text-muted">PDF, images, Word documents, PowerPoint or text · up to 15 MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.md,.doc,.docx,.ppt,.pptx,application/pdf,image/*,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                if (f && !upTitle) setUpTitle(f.name.replace(/\.[^.]+$/, ''))
              }}
              disabled={upPct !== null && upPct < 100}
              className="mt-3 block w-full text-sm text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-[rgb(var(--sg-surface-muted))] file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-[rgb(var(--sg-hover))]"
              aria-label="Choose a file to upload"
            />
            {file && (
              <p className="mt-2 text-xs text-muted">
                {file.name} · {formatBytes(file.size) ?? `${file.size} B`}
              </p>
            )}
            {file && upPct !== null && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--sg-surface-muted))]" role="progressbar" aria-valuenow={upPct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-200" style={{ width: `${upPct}%` }} />
                </div>
                <p className="mt-1 text-right text-[10px] tabular-nums text-muted">{upPct}%</p>
              </div>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label="Title (optional)" value={upTitle} onChange={(e) => setUpTitle(e.target.value)} placeholder="Defaults to file name" disabled={upPct !== null && upPct < 100} />
              <Select label="Group" value={upGroup} onChange={(e) => setUpGroup(e.target.value)} disabled={upPct !== null && upPct < 100}>
                <option value="">No group (personal)</option>
                {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
              <div className="sm:col-span-2">
                <Textarea label="Description (optional)" value={upDesc} onChange={(e) => setUpDesc(e.target.value)} disabled={upPct !== null && upPct < 100} />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={startUpload} disabled={!file || (upPct !== null && upPct < 100)} isLoading={upPct === 100}>
                {upPct !== null && upPct < 100 ? `Uploading ${upPct}%` : 'Upload file'}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[rgb(var(--sg-border))]" />
            <span className="text-xs text-muted">or share a link</span>
            <span className="h-px flex-1 bg-[rgb(var(--sg-border))]" />
          </div>

          {/* Link sharing (existing flow) */}
          <form onSubmit={share} className="space-y-4">
            <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <Input label="URL" type="url" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} required placeholder="https://…" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                {['LINK', 'PDF', 'NOTE', 'VIDEO', 'IMAGE', 'DOCUMENT'].map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select label="Group" value={form.groupId} onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))}>
                <option value="">No group (personal)</option>
                {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </div>
            <Textarea label="Description (optional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <Button type="submit" isLoading={saving} disabled={saving || !form.title.trim() || !form.url.trim()}>Share link</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
