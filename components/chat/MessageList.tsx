'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import type { Message, User } from '@/types'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  users: Record<string, User>
  onLoadMore?: () => void
  hasMore?: boolean
}

export function MessageList({ messages, currentUserId, users, onLoadMore, hasMore }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleScroll = () => {
    if (containerRef.current && onLoadMore && hasMore) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      if (scrollTop === 0) {
        onLoadMore()
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto space-y-4 p-4 pb-0"
      style={{ scrollBehavior: 'smooth' }}
    >
      {hasMore && onLoadMore && (
        <div className="flex justify-center pb-4">
          <button
            onClick={onLoadMore}
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Load more messages
          </button>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => {
          const user = users[message.userId]
          const prevMessage = messages[index - 1]
          const isConsecutive = prevMessage && prevMessage.userId === message.userId
          const showAvatar = !isConsecutive
          const showName = !isConsecutive

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {user && (
                <MessageBubble
                  message={message}
                  currentUserId={currentUserId}
                  user={user}
                  isConsecutive={isConsecutive}
                  showAvatar={showAvatar}
                  showName={showName}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
  )
}

interface TypingIndicatorProps {
  users: User[]
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 px-4 py-2 text-text-muted"
    >
      <div className="flex items-center gap-1 px-3 py-2 bg-subCrack-tertiary rounded-full">
        <span className="text-xs">Typing</span>
        <span className="flex items-center gap-0.5">
          {users.slice(0, 3).map((user, i) => (
            <motion.span
              key={user.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ scale: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              className="h-1.5 w-1.5 rounded-full bg-text-muted"
            />
          ))}
        </span>
      </div>
    </motion.div>
  )
}