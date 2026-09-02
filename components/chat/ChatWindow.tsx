'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, Paperclip, Smile, MoreVertical, Search, Info } from 'lucide-react'
import { MessageList } from './MessageList'
import { TypingIndicator } from './MessageList'
import { MessageInput } from './MessageBubble'
import { useChatStore } from '@/lib/store'
import type { Message, User } from '@/types'

interface ChatWindowProps {
  groupId: string
  currentUserId: string
  users: Record<string, User>
  groupMembers: { userId: string; role: string }[]
}

export function ChatWindow({ groupId, currentUserId, users, groupMembers }: ChatWindowProps) {
  const { messages, isConnected, typingUsers, addMessage, setConnected, setTyping } = useChatStore()
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Simulate real-time connection
  useEffect(() => {
    setConnected(true)

    // Simulate receiving messages
    const interval = setInterval(() => {
      if (Math.random() > 0.95 && groupMembers.length > 1) {
        const otherMembers = groupMembers.filter(m => m.userId !== currentUserId)
        if (otherMembers.length > 0 && users[otherMembers[0].userId]) {
          const sender = otherMembers[Math.floor(Math.random() * otherMembers.length)]
          const sampleMessages = [
            "Great question! Let me think about that...",
            "I've been working on this too.",
            "Does anyone have the study guide?",
            "Meeting at the library later?",
            "I found a really good resource for this topic.",
            "Can we review this together tomorrow?",
            "The professor's office hours are tomorrow at 2pm.",
            "I'm stuck on problem 3 as well.",
            "Anyone want to form a study group for the final?",
            "I'll share my notes in the resources section.",
          ]
          addMessage({
            id: `msg-${Date.now()}`,
            groupId,
            userId: sender.userId,
            content: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
            type: 'text',
            createdAt: new Date().toISOString(),
          })
        }
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      setConnected(false)
    }
  }, [groupId, currentUserId, groupMembers, users, addMessage, setConnected])

  const handleSend = useCallback((content: string) => {
    addMessage({
      id: `msg-${Date.now()}`,
      groupId,
      userId: currentUserId,
      content,
      type: 'text',
      createdAt: new Date().toISOString(),
    })
  }, [groupId, currentUserId, addMessage])

  const handleTyping = useCallback((isTyping: boolean) => {
    setTyping(currentUserId, isTyping)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(currentUserId, false)
      }, 2000)
    }
  }, [currentUserId, setTyping])

  const otherTypingUsers = Object.values(users).filter((u: User) => typingUsers.has(u.id))

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] card-glass overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-velvet-charcoal/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-velvet-royal to-velvet-plum flex items-center justify-center">
            <span className="text-sm font-bold text-text-primary">
              {groupMembers.length}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Group Chat</h3>
            <p className="text-xs text-text-muted flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-status-success' : 'bg-text-muted'}`} />
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl hover:bg-subCrack-tertiary transition-colors text-text-muted">
            <Search className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-xl hover:bg-subCrack-tertiary transition-colors text-text-muted">
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages.filter(m => m.groupId === groupId)}
        currentUserId={currentUserId}
        users={users}
      />

      {/* Typing Indicator */}
      <TypingIndicator users={otherTypingUsers} />

      {/* Message Input */}
      <MessageInput
        onSend={handleSend}
        disabled={isLoading}
        placeholder={`Message ${groupMembers.length} members...`}
      />
    </div>
  )
}