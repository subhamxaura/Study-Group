'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChatWindow } from '@/components/chat'
import { useGroupStore, useAuthStore, useChatStore } from '@/lib/store'
import { mockGroups, mockUsers, mockMessages } from '@/lib/mockData'
import type { User, Group } from '@/types'

export default function ChatPage() {
  const params = useParams()
  const { user } = useAuthStore()
  const { currentGroup } = useGroupStore()
  const { setMessages } = useChatStore()

  const groupId = params.id as string
  const [group, setGroup] = useState<Group | null>(null)
  const [users, setUsers] = useState<Record<string, User>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      await new Promise((r) => setTimeout(r, 300))

      // Use currentGroup from store if it matches, otherwise check all groups or fallback to mock
      let foundGroup = currentGroup?.id === groupId ? currentGroup : null

      if (!foundGroup) {
         const { groups } = useGroupStore.getState()
         foundGroup = groups.find((g) => g.id === groupId) || null
      }

      if (!foundGroup) {
         foundGroup = mockGroups.find((g) => g.id === groupId) || null
      }

      if (foundGroup) {
        setGroup(foundGroup)
        const userMap: Record<string, User> = {}
        foundGroup.members?.forEach((m) => {
          const u = mockUsers.find((usr) => usr.id === m.userId)
          if (u) userMap[u.id] = u
        })
        setUsers(userMap)
        // Ensure mockMessages handles dynamic IDs or fall back to empty array
        setMessages(mockMessages[groupId] || [])
      }
      setIsLoading(false)
    }
    loadData()
  }, [groupId, currentGroup, setMessages])

  if (isLoading) {
    return (
      <div className="section-container flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!group || !user) {
    return (
      <div className="section-container text-center py-20">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Unable to load chat</h2>
        <p className="text-text-muted">Please try again later.</p>
      </div>
    )
  }

  const currentUserId = user.id
  const groupMembers = group.members || []

  return (
    <div className="section-container">
      <ChatWindow
        groupId={groupId}
        currentUserId={currentUserId}
        users={users}
        groupMembers={groupMembers}
      />
    </div>
  )
}