'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from '@/lib/client'

export type GroupRealtimeEvent =
  | { type: 'ready'; groupId: string; userId: string }
  | { type: 'presence'; users: string[] }
  | { type: 'typing'; users: string[] }
  | { type: 'messages.changed'; groupId: string; actorId: string; publishedAt: string }
  | { type: 'unauthorized' }

type TicketResponse = { ticket: string; websocketUrl: string; expiresAt: string }
type ServerFrame = { type?: string; [key: string]: unknown }

function validIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 128).slice(0, 500)
}

export function useGroupRealtime(
  groupId: string,
  enabled: boolean,
  onEvent?: (event: GroupRealtimeEvent) => void,
) {
  const [connected, setConnected] = useState(false)
  const [online, setOnline] = useState<string[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const eventRef = useRef(onEvent)

  useEffect(() => { eventRef.current = onEvent }, [onEvent])

  useEffect(() => {
    if (!enabled || !groupId) {
      setConnected(false)
      setOnline([])
      return
    }
    setConnected(false)
    setOnline([])

    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let socket: WebSocket | null = null
    let attempts = 0

    const clearState = () => {
      setConnected(false)
      setOnline([])
      eventRef.current?.({ type: 'presence', users: [] })
      eventRef.current?.({ type: 'typing', users: [] })
    }

    const scheduleRetry = () => {
      if (disposed || retryTimer) return
      const base = Math.min(30_000, 750 * (2 ** Math.min(attempts, 6)))
      const delay = Math.round(base * (0.8 + Math.random() * 0.4))
      attempts += 1
      retryTimer = setTimeout(() => {
        retryTimer = null
        void connect()
      }, delay)
    }

    const connect = async () => {
      if (disposed) return
      try {
        const ticket = await api.post<TicketResponse>('/api/realtime/tickets', { groupId })
        if (disposed) return
        const ws = new WebSocket(ticket.websocketUrl)
        socket = ws
        socketRef.current = ws

        ws.onopen = () => {
          if (!disposed && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'auth', ticket: ticket.ticket }))
          }
        }
        ws.onmessage = (message) => {
          if (disposed || typeof message.data !== 'string') return
          let frame: ServerFrame
          try { frame = JSON.parse(message.data) as ServerFrame } catch { return }
          if (frame.type === 'ready' && typeof frame.groupId === 'string' && typeof frame.userId === 'string') {
            attempts = 0
            setConnected(true)
            eventRef.current?.({ type: 'ready', groupId: frame.groupId, userId: frame.userId })
          } else if (frame.type === 'presence') {
            const users = validIds(frame.users)
            setOnline(users)
            eventRef.current?.({ type: 'presence', users })
          } else if (frame.type === 'typing') {
            eventRef.current?.({ type: 'typing', users: validIds(frame.users) })
          } else if (
            frame.type === 'messages.changed' &&
            typeof frame.groupId === 'string' &&
            typeof frame.actorId === 'string' &&
            typeof frame.publishedAt === 'string'
          ) {
            eventRef.current?.({
              type: 'messages.changed',
              groupId: frame.groupId,
              actorId: frame.actorId,
              publishedAt: frame.publishedAt,
            })
          }
        }
        ws.onerror = () => ws.close()
        ws.onclose = (event) => {
          if (socketRef.current === ws) socketRef.current = null
          if (socket === ws) socket = null
          if (disposed) return
          clearState()
          if (event.code === 4403) {
            eventRef.current?.({ type: 'unauthorized' })
            return
          }
          scheduleRetry()
        }
      } catch (error) {
        if (disposed) return
        clearState()
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          eventRef.current?.({ type: 'unauthorized' })
          return
        }
        scheduleRetry()
      }
    }

    void connect()
    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      const current = socket
      socket = null
      if (socketRef.current === current) socketRef.current = null
      if (current && current.readyState < WebSocket.CLOSING) current.close(1000, 'Group changed')
    }
  }, [groupId, enabled])

  const sendTyping = useCallback((active: boolean): boolean => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    try {
      socket.send(JSON.stringify({ type: 'typing', active }))
      return true
    } catch {
      return false
    }
  }, [])

  return { connected, online, sendTyping }
}
