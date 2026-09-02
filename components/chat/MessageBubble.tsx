'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Image, Link2, Download, MoreHorizontal, Check, Clock } from 'lucide-react'
import { formatTime, formatRelativeTime, getFileIcon } from '@/lib/utils'
import type { Message, User } from '@/types'

interface MessageBubbleProps {
  message: Message
  currentUserId: string
  user: User
  isConsecutive?: boolean
  showAvatar?: boolean
  showName?: boolean
}

export function MessageBubble({
  message,
  currentUserId,
  user,
  isConsecutive = false,
  showAvatar = true,
  showName = true,
}: MessageBubbleProps) {
  const isOwn = message.userId === currentUserId

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-velvet-royal to-velvet-plum flex items-center justify-center">
            <span className="text-xs font-medium text-text-primary">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      {!isOwn && !showAvatar && <div className="w-8 flex-shrink-0" />}

      <div className={`flex-1 ${isOwn ? 'text-right' : ''} max-w-[75%]`}>
        {!isConsecutive && showName && !isOwn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-1 text-xs font-medium text-text-secondary px-1"
          >
            {user.name}
          </motion.div>
        )}

        <div
          className={`
            inline-block max-w-[85%] px-4 py-2 rounded-2xl
            ${isOwn
              ? 'bg-gradient-to-br from-accent-gold to-accent-gold-muted text-subCrack-primary rounded-tr-md'
              : 'bg-subCrack-tertiary text-text-primary border border-velvet-charcoal rounded-tl-md'
            }
          `}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        </div>

        <div className={`flex items-center gap-2 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'} px-1`}>
          <span className="text-xs text-text-muted">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            <span className="text-xs text-text-muted">
              <Check className="h-3 w-3 inline-block align-middle" />
            </span>
          )}
        </div>
      </div>

      {isOwn && <div className="w-8 flex-shrink-0" />}
    </motion.div>
  )
}

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({ onSend, disabled, placeholder = 'Type a message...' }: MessageInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setValue('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4 border-t border-velvet-charcoal/50">
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full min-h-[48px] max-h-[150px] px-4 py-3 pr-12
            rounded-xl bg-subCrack-tertiary border border-velvet-charcoal
            text-text-primary placeholder-text-muted
            focus:outline-none focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/20
            focus:bg-subCrack-card resize-none disabled:opacity-50
            transition-all duration-200
          `}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={`
            absolute bottom-3 right-3 p-2 rounded-xl transition-all duration-200
            ${!value.trim() || disabled
              ? 'text-text-muted cursor-not-allowed'
              : 'text-accent-gold hover:bg-accent-gold/10 hover:text-accent-gold-muted'
            }
          `}
        >
          <span className="text-accent-gold">➤</span>
        </button>
      </div>
    </form>
  )
}