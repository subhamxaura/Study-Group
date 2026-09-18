'use client'
/**
 * Group discussion — delta-synced chat with optimistic sends.
 *
 * Rendering contract: the message list is windowed to the last
 * RENDER_WINDOW messages; older history loads on demand. The sync poller
 * merges upserts (new/edited/reaction changes) in one store pass and applies
 * deletions separately, so other users' edits/reactions propagate.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Pin, Smile, Reply, Pencil, Trash2, X, ArrowDown, Paperclip, FileText, Loader2,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useSession, useChatStore } from '@/lib/store'
import { api } from '@/lib/client'
import { tokenizeMentions } from '@/lib/mentions'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

const EMOJIS = ['👍', '❤️', '😂', '🎯', '🔥', '👏']
const POLL_ACTIVE_MS = 2500
const POLL_IDLE_MS = 8000
const RENDER_WINDOW = 80
const NEAR_BOTTOM_PX = 200

interface ChatWindowProps {
  groupId: string
  members?: Array<{ user: { id: string; name: string; avatarUrl: string | null } }>
  onOnlineChange?: (n: number) => void
}

interface SyncPayload {
  messages: ChatMessage[]
  deletedIds: string[]
  online: string[]
  typing: string[]
  myLastReadAt: string | null
  serverTime: string
}

interface UploadResult { resource: { id: string; url: string; title: string; mimeType: string | null; sizeBytes: number | null; type: string } }

function renderContent(content: string, members: Array<{ id: string; name: string }>) {
  // Shared tokenizer — same longest-prefix rule the server uses to resolve mentions,
  // so a highlighted @Name is always one the server actually notified.
  const tokens = tokenizeMentions(content, members)
  return tokens.map((t, i) =>
    t.type === 'mention' ? (
      <span key={i} className="rounded bg-white/20 px-1 font-medium text-inherit">
        @{t.value}
      </span>
    ) : (
      <span key={i}>{t.value}</span>
    ),
  )
}

export function ChatWindow({ groupId, members = [], onOnlineChange }: ChatWindowProps) {
  const user = useSession((s) => s.user)
  const messages = useChatStore((s) => s.messages)
  const typing = useChatStore((s) => s.typing)
  const online = useChatStore((s) => s.online)
  const connected = useChatStore((s) => s.connected)
  // Actions are stable references in Zustand — select them individually.
  // (An object-returning selector creates a new snapshot every read and
  // sends useSyncExternalStore into an infinite re-render loop.)
  const setMessages = useChatStore((s) => s.setMessages)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const addMessage = useChatStore((s) => s.addMessage)
  const upsertMessages = useChatStore((s) => s.upsertMessages)
  const removeMessage = useChatStore((s) => s.removeMessage)
  const removeMessages = useChatStore((s) => s.removeMessages)
  const updateMessage = useChatStore((s) => s.updateMessage)
  const toggleReaction = useChatStore((s) => s.toggleReaction)
  const setConnected = useChatStore((s) => s.setConnected)
  const setTyping = useChatStore((s) => s.setTyping)
  const setOnline = useChatStore((s) => s.setOnline)
  const reset = useChatStore((s) => s.reset)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [reactionFor, setReactionFor] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<{ file: File; uploading: boolean } | null>(null)
  const [atQuery, setAtQuery] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingSentRef = useRef(false)
  const cursorRef = useRef<string | null>(null)
  const vCursorRef = useRef<string | null>(null)
  const visibleRef = useRef(true)
  const atBottomRef = useRef(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mention candidates from the actual member list
  const memberOptions = useMemo(
    () => members.map((m) => m.user).filter((u) => u.id !== user?.id),
    [members, user?.id],
  )
  const mentionMatches = useMemo(() => {
    if (atQuery === null) return []
    const q = atQuery.toLowerCase()
    return memberOptions.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 5)
  }, [atQuery, memberOptions])



  // Initial load
  useEffect(() => {
    reset()
    let alive = true
    api.get<{ messages: ChatMessage[]; hasMore: boolean }>(`/api/groups/${groupId}/messages?limit=40`)
      .then((d) => {
        if (!alive) return
        setMessages(d.messages)
        setHasMore(d.hasMore)
        cursorRef.current = d.messages.length
          ? d.messages[d.messages.length - 1].createdAt
          : new Date().toISOString()
      })
      .catch(() => {})
      .finally(() => { if (alive) setConnected(true) })
    return () => { alive = false }
  }, [groupId, reset, setMessages, setConnected])

  // Delta sync — new/changed messages, deletions, presence, typing, mark-read
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      if (stopped) return
      try {
        const params = new URLSearchParams()
        if (cursorRef.current) params.set('since', cursorRef.current)
        if (vCursorRef.current) params.set('vsince', vCursorRef.current)
        const d = await api.get<SyncPayload>(`/api/groups/${groupId}/sync?${params.toString()}`)
        if (stopped) return
        upsertMessages(d.messages)
        removeMessages(d.deletedIds)
        if (d.messages.length) {
          const maxCreated = d.messages.reduce((acc, m) => (m.createdAt > acc ? m.createdAt : acc), cursorRef.current ?? '')
          cursorRef.current = maxCreated
          const maxUpdated = d.messages.reduce((acc, m) => (m.updatedAt > acc ? m.updatedAt : acc), vCursorRef.current ?? '')
          vCursorRef.current = maxUpdated
          // Count arrivals while scrolled up as unread
          const fromOthers = d.messages.filter((m) => m.user.id !== user?.id)
          if (!atBottomRef.current && fromOthers.length) {
            setUnreadCount((c) => c + fromOthers.length)
          }
        }
        setOnline(d.online)
        onOnlineChange?.(d.online.length)
        setTyping(d.typing)
        setConnected(true)
      } catch {
        if (!stopped) setConnected(false)
      }
      if (!stopped) timer = setTimeout(tick, visibleRef.current ? POLL_ACTIVE_MS : POLL_IDLE_MS)
    }
    timer = setTimeout(tick, POLL_ACTIVE_MS)

    const onVisibility = () => { visibleRef.current = document.visibilityState === 'visible' }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  // Mark read when at bottom and window visible; reset unread badge
  useEffect(() => {
    if (!atBottomRef.current || document.visibilityState !== 'visible') return
    setUnreadCount(0)
    const handle = setTimeout(() => {
      api.patch(`/api/groups/${groupId}/sync`, { lastReadAt: new Date().toISOString() }).catch(() => {})
    }, 800)
    return () => clearTimeout(handle)
  }, [messages.length, groupId])

  // Auto-scroll on new messages when near bottom
  useEffect(() => {
    const el = listRef.current
    if (!el || !atBottomRef.current) return
    el.scrollTo({ top: el.scrollHeight })
  }, [messages.length])

  useEffect(() => () => reset(), [reset])

  const trackTyping = () => {
    if (typingSentRef.current) return
    typingSentRef.current = true
    api.post(`/api/groups/${groupId}/sync`, { typing: true }).catch(() => {})
    if (typingRef.current) clearTimeout(typingRef.current)
    typingRef.current = setTimeout(() => { typingSentRef.current = false }, 2500)
  }

  const onInputChange = (v: string) => {
    setInput(v)
    trackTyping()
    // @-mention detection: an @ after whitespace/start that is not yet closed
    const uptoCursor = v
    const m = /(?:^|\s)@([A-Za-z0-9_.]*)$/.exec(uptoCursor)
    setAtQuery(m ? m[1] : null)
  }

  const pickMention = (name: string) => {
    setInput((v) => v.replace(/(?:^|\s)@([A-Za-z0-9_.]*)$/, (_full, _q) => ` @${name} `))
    setAtQuery(null)
    inputRef.current?.focus()
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = input.trim()
    if ((!content && !attachment) || sending) return
    setSending(true)
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`, kind: attachment ? 'FILE' : 'TEXT', content,
      pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, user: { name: replyTo.user.name } } : null,
      user: { id: user!.id, name: user!.name, avatarUrl: user!.avatarUrl },
      reactions: [], mentions: [],
    }
    addMessage(optimistic)
    const wasReply = replyTo
    setReplyTo(null)
    const wasAttachment = attachment
    setAttachment(null)
    setInput('')
    setAtQuery(null)
    try {
      let message: ChatMessage
      if (wasAttachment) {
        const fd = new FormData()
        fd.append('file', wasAttachment.file)
        fd.append('groupId', groupId)
        if (content) fd.append('title', content)
        const up = await api.upload<UploadResult>('/api/uploads', fd)
        // Post a message that references the uploaded file
        const d = await api.post<{ message: ChatMessage }>(`/api/groups/${groupId}/messages`, {
          content: content || `📎 ${up.resource.title}`,
          replyToId: wasReply?.id || undefined,
        })
        message = d.message
      } else {
        const d = await api.post<{ message: ChatMessage }>(`/api/groups/${groupId}/messages`, {
          content, replyToId: wasReply?.id || undefined,
        })
        message = d.message
      }
      removeMessage(optimistic.id)
      addMessage(message)
      if (message.createdAt > (cursorRef.current ?? '')) cursorRef.current = message.createdAt
    } catch {
      removeMessage(optimistic.id)
      setInput(content)
      setReplyTo(wasReply)
      if (wasAttachment) setAttachment({ file: wasAttachment.file, uploading: false })
    } finally {
      setSending(false)
    }
  }

  const pickFile = (f: File | null) => {
    if (!f) return
    setAttachment({ file: f, uploading: false })
  }

  const loadOlder = async () => {
    if (loadingOlder || !messages.length) return
    setLoadingOlder(true)
    try {
      const d = await api.get<{ messages: ChatMessage[]; hasMore: boolean }>(
        `/api/groups/${groupId}/messages?limit=40&before=${encodeURIComponent(messages[0].createdAt)}`
      )
      prependMessages(d.messages)
      setHasMore(d.hasMore)
    } finally {
      setLoadingOlder(false)
    }
  }

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const d = await api.get<{ messages: ChatMessage[] }>(
        `/api/groups/${groupId}/messages?q=${encodeURIComponent(q.trim())}&limit=25`
      )
      setSearchResults(d.messages)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [groupId])

  // Debounced server-side search
  useEffect(() => {
    if (!searchOpen) return
    const handle = setTimeout(() => runSearch(searchQuery), 300)
    return () => clearTimeout(handle)
  }, [searchQuery, searchOpen, runSearch])

  const react = async (messageId: string, emoji: string) => {
    setReactionFor(null)
    toggleReaction(messageId, emoji, user!.id)
    await api.post(`/api/messages/${messageId}/reactions`, { emoji }).catch(() => {})
  }

  const saveEdit = async () => {
    if (!editing) return
    const { id, content } = editing
    setEditing(null)
    updateMessage(id, { content })
    await api.patch(`/api/messages/${id}`, { content }).catch(() => {})
  }

  const del = async (id: string) => {
    removeMessage(id)
    await api.del(`/api/messages/${id}`).catch(() => {})
  }

  const pin = async (id: string) => {
    const m = messages.find((x) => x.id === id)
    if (!m) return
    updateMessage(id, { pinned: !m.pinned })
    await api.post(`/api/messages/${id}/pin`).catch(() => {})
  }

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
  }

  const jumpToLatest = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    setUnreadCount(0)
  }

  const shown = searchOpen && searchResults !== null ? searchResults : messages
  // Render only the tail of long histories
  const windowed = searchOpen && searchResults !== null ? shown : shown.slice(-RENDER_WINDOW)
  const hasUnreadSeparator = unreadCount > 0 && windowed.length > 0

  const typingNames = typing
    .map((id) => messages.find((m) => m.user.id === id)?.user.name ?? members.find((mm) => mm.user.id === id)?.user.name)
    .filter(Boolean) as string[]
  const onlineSet = useMemo(() => new Set(online), [online])

  return (
    <div className="flex h-[calc(100vh-230px)] min-h-[440px] flex-col overflow-hidden rounded-xl border bg-[rgb(var(--sg-card))]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Discussion</h3>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-emerald-500' : 'bg-zinc-400')} />
            {connected ? `Live · ${online.length} online` : 'Reconnecting…'}
          </p>
        </div>
        <button
          onClick={() => { setSearchOpen((s) => { const n = !s; if (!n) { setSearchQuery(''); setSearchResults(null) } return n }) }}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-[rgb(var(--sg-hover))]"
          aria-label="Search messages" aria-expanded={searchOpen}
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search this discussion…"
            className="w-full bg-transparent text-sm outline-none"
            aria-label="Search messages"
          />
          {searching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
          <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults(null) }} className="rounded-md p-1 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pinned strip */}
      {!searchOpen && messages.some((m) => m.pinned) && (
        <div className="flex items-center gap-2 border-b bg-amber-50/60 px-4 py-2 text-xs dark:bg-amber-500/5">
          <Pin className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="truncate">
            Pinned: {messages.filter((m) => m.pinned).slice(-1)[0]?.content.slice(0, 80)}
          </span>
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-1 overflow-y-auto px-4 py-3" role="log" aria-label="Chat messages">
        {searchOpen && searchResults !== null ? (
          <p className="py-2 text-center text-xs text-muted">
            {searching ? 'Searching…' : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
          </p>
        ) : hasMore && (
          <div className="pb-2 text-center">
            <button onClick={loadOlder} disabled={loadingOlder} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              {loadingOlder ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}
        {windowed.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            {searchOpen ? 'No messages match your search.' : 'No messages yet. Say hello 👋'}
          </p>
        )}
        {windowed.map((m, idx) => {
          const isMine = m.user.id === user?.id
          const prev = windowed[idx - 1]
          const showHeader = !prev ||
            prev.user.id !== m.user.id ||
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60000
          const showUnread = hasUnreadSeparator && idx >= windowed.length - unreadCount && (idx === 0 || idx < windowed.length - unreadCount || true) && idx === windowed.length - unreadCount
          return (
            <div key={m.id} className={cn('group relative', showHeader ? 'mt-3' : 'mt-0.5')}>
              {showUnread && (
                <div className="absolute -top-2 left-0 right-0 flex items-center gap-2" aria-hidden="true">
                  <span className="h-px flex-1 bg-red-400/60" />
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">New</span>
                  <span className="h-px flex-1 bg-red-400/60" />
                </div>
              )}
              {showHeader && (
                <div className="mb-1 flex items-center gap-2">
                  <Avatar name={m.user.name} src={m.user.avatarUrl} size="xs" />
                  <span className="text-xs font-semibold">{m.user.name}</span>
                  {onlineSet.has(m.user.id) && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Online" />}
                  <time className="text-[10px] text-muted" dateTime={m.createdAt}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </time>
                  {m.updatedAt > m.createdAt && !m.content.startsWith('[deleted]') && (
                    <span className="text-[10px] text-muted">(edited)</span>
                  )}
                  {m.pinned && <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
                </div>
              )}
              {m.replyTo && (
                <div className="mb-0.5 ml-6 border-l-2 border-[rgb(var(--sg-border))] pl-2 text-xs text-muted">
                  <span className="font-medium">{m.replyTo.user.name}</span>: {m.replyTo.content.slice(0, 60)}
                </div>
              )}
              <div className={cn('flex items-start gap-2', isMine && 'flex-row-reverse')}>
                <p className={cn(
                  'max-w-[75%] whitespace-pre-wrap rounded-xl px-3 py-1.5 text-sm leading-relaxed',
                  m.content.startsWith('[deleted]')
                    ? 'border border-dashed border-[rgb(var(--sg-border))] text-muted italic'
                    : isMine
                      ? 'rounded-br-sm bg-[rgb(var(--sg-accent))] text-white'
                      : 'rounded-bl-sm bg-[rgb(var(--sg-surface-muted))] text-[rgb(var(--sg-foreground))]'
                )}>
                  {renderContent(m.content, memberOptions)}
                </p>
                {!m.content.startsWith('[deleted]') && (
                  <div className={cn('flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100', isMine && 'flex-row-reverse')}>
                    <button onClick={() => setReactionFor(reactionFor === m.id ? null : m.id)} className="rounded p-1 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="React"><Smile className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setReplyTo(m)} className="rounded p-1 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Reply"><Reply className="h-3.5 w-3.5" /></button>
                    {isMine && <button onClick={() => setEditing({ id: m.id, content: m.content })} className="rounded p-1 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>}
                    {isMine && <button onClick={() => del(m.id)} className="rounded p-1 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}
                    <button onClick={() => pin(m.id)} className="rounded p-1 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label={m.pinned ? 'Unpin' : 'Pin (admins)'}><Pin className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
              {m.reactions.length > 0 && (
                <div className="ml-6 mt-1 flex flex-wrap gap-1">
                  {Object.entries(m.reactions.reduce<Record<string, string[]>>((acc, r) => {
                    (acc[r.emoji] ||= []).push(r.userId); return acc
                  }, {})).map(([emoji, userIds]) => (
                    <button
                      key={emoji}
                      onClick={() => react(m.id, emoji)}
                      className={cn(
                        'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors',
                        userIds.includes(user?.id ?? '')
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300'
                          : 'border-[rgb(var(--sg-border))] text-muted hover:bg-[rgb(var(--sg-hover))]'
                      )}
                    >
                      {emoji} {userIds.length}
                    </button>
                  ))}
                </div>
              )}
              {reactionFor === m.id && (
                <div className="absolute z-10 ml-6 mt-1 flex gap-1 rounded-lg border bg-[rgb(var(--sg-card))] p-1.5 shadow-medium">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => react(m.id, e)} className="rounded p-1 text-base hover:bg-[rgb(var(--sg-hover))]" aria-label={`React ${e}`}>{e}</button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {/* Typing indicator */}
        {typingNames.length > 0 && !searchOpen && (
          <div className="flex items-center gap-2 px-1 pt-2 text-xs text-muted">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}
            </span>
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Jump to latest */}
      {!atBottomRef.current && (
        <button
          onClick={jumpToLatest}
          className="absolute bottom-24 right-8 z-10 flex items-center gap-1.5 rounded-full border bg-[rgb(var(--sg-card))] px-3 py-1.5 text-xs font-medium shadow-medium transition-transform hover:scale-[1.03]"
        >
          {unreadCount > 0 ? `${unreadCount} new message${unreadCount === 1 ? '' : 's'}` : 'Jump to latest'}
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Mention autocomplete */}
      {mentionMatches.length > 0 && (
        <div className="border-t bg-[rgb(var(--sg-card))] px-3 py-1.5" role="listbox" aria-label="Mention a group member">
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Mention</p>
          {mentionMatches.map((u) => (
            <button key={u.id} onClick={() => pickMention(u.name)} role="option" aria-selected={false}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[rgb(var(--sg-hover))]">
              <Avatar name={u.name} src={u.avatarUrl} size="xs" />
              {u.name}
            </button>
          ))}
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="flex items-center gap-2 border-t bg-[rgb(var(--sg-surface-muted))]/60 px-4 py-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-muted" />
          <span className="min-w-0 flex-1 truncate">{attachment.file.name} ({Math.max(1, Math.round(attachment.file.size / 1024))} KB)</span>
          {attachment.uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
          <button onClick={() => setAttachment(null)} className="rounded p-0.5 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Remove attachment">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t bg-[rgb(var(--sg-surface-muted))]/60 px-4 py-2 text-xs">
          <Reply className="h-3.5 w-3.5 text-muted" />
          <span className="min-w-0 flex-1 truncate text-muted">Replying to <b>{replyTo.user.name}</b>: {replyTo.content.slice(0, 50)}</span>
          <button onClick={() => setReplyTo(null)} className="rounded p-0.5 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Cancel reply"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Edit bar */}
      {editing && (
        <div className="flex items-center gap-2 border-t bg-amber-50/60 px-4 py-2 dark:bg-amber-500/5">
          <Pencil className="h-3.5 w-3.5 text-muted" />
          <input
            autoFocus value={editing.content}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditing(null) }}
            className="w-full bg-transparent text-sm outline-none"
            aria-label="Edit message"
          />
          <button onClick={saveEdit} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">Save</button>
          <button onClick={() => setEditing(null)} className="text-xs text-muted hover:underline">Cancel</button>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={send} className="flex items-center gap-2 border-t p-3">
        <input ref={fileInputRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
          onChange={(e) => { pickFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-[rgb(var(--sg-hover))]" aria-label="Attach a file">
          <Paperclip className="h-4 w-4" />
        </button>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (mentionMatches.length && (e.key === 'Enter' || e.key === 'Tab')) {
                e.preventDefault()
                pickMention(mentionMatches[0].name)
              }
            }}
            placeholder="Write a message…  @ to mention"
            className="input py-2"
            aria-label="Message"
            maxLength={4000}
          />
        </div>
        <button type="submit" disabled={(!input.trim() && !attachment) || sending} className="btn btn-primary btn-sm shrink-0" aria-label="Send message">
          Send
        </button>
      </form>
    </div>
  )
}
