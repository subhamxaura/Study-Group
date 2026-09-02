'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui'
import { GroupList, CreateGroupModal } from '@/components/groups'
import { useGroupStore, useAuthStore } from '@/lib/store'
import { mockGroups } from '@/lib/mockData'
import type { Group } from '@/types'

export default function GroupsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { groups, setGroups, addGroup } = useGroupStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading groups - merge persisted groups with mock groups
    const loadGroups = async () => {
      await new Promise((r) => setTimeout(r, 500))
      const { groups: persistedGroups } = useGroupStore.getState()
      // Keep user-created groups, add mock groups that aren't already in persisted list
      const userGroupIds = new Set(persistedGroups.map(g => g.id))
      const merged = [...persistedGroups, ...mockGroups.filter(g => !userGroupIds.has(g.id))]
      setGroups(merged)
      setIsLoading(false)
    }
    loadGroups()
  }, [setGroups])

  const userGroupIds = new Set(
    groups.filter((g: Group) => g.members?.some((m) => m.userId === user?.id)).map((g: Group) => g.id)
  )

  const handleCreateGroup = (data: { name: string; description: string; isPrivate: boolean }) => {
    const groupId = `group-${Date.now()}`
    const newGroup: Group = {
      id: groupId,
      name: data.name,
      description: data.description,
      ownerId: user?.id || '',
      members: [
        {
          userId: user?.id || '',
          groupId: groupId,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addGroup(newGroup)
    useGroupStore.getState().setCurrentGroup(newGroup)
    setIsCreateModalOpen(false)
    router.push(`/groups/${newGroup.id}/chat`)
  }

  const handleJoinGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (group && user) {
      const updatedGroup = {
        ...group,
        members: [
          ...group.members,
          {
            userId: user.id,
            groupId,
            role: 'member' as const,
            joinedAt: new Date().toISOString(),
          },
        ],
      }
      useGroupStore.getState().updateGroup(updatedGroup)
    }
  }

  const handleLeaveGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (group && user) {
      const updatedGroup = {
        ...group,
        members: group.members.filter((m) => m.userId !== user.id),
      }
      useGroupStore.getState().updateGroup(updatedGroup)
    }
  }

  const handleNavigateGroup = (groupId: string) => {
    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Groups</h1>
            <p className="text-text-muted mt-1">
              {userGroupIds.size === 0
                ? "You haven't joined any groups yet"
                : `You're a member of ${userGroupIds.size} group${userGroupIds.size !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <GroupList
          groups={groups}
          userGroups={userGroupIds}
          onJoin={handleJoinGroup}
          onLeave={handleLeaveGroup}
          onNavigate={handleNavigateGroup}
          onCreate={() => setIsCreateModalOpen(true)}
          isLoading={isLoading}
        />
      </motion.div>

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateGroup}
      />
    </div>
  )
}