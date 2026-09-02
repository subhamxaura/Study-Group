'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Crown, Shield, UserPlus, MoreVertical, Mail } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { Button } from '@/components/ui'
import { useGroupStore, useAuthStore } from '@/lib/store'
import { mockGroups, mockUsers } from '@/lib/mockData'
import type { Group, GroupMember, User } from '@/types'

export default function MembersPage() {
  const params = useParams()
  const { user } = useAuthStore()
  const { currentGroup, removeMember } = useGroupStore()

  const groupId = params.id as string
  const [group, setGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    const loadData = async () => {
      await new Promise((r) => setTimeout(r, 300))
      const foundGroup = mockGroups.find((g) => g.id === groupId)
      if (foundGroup) setGroup(foundGroup)
      setIsLoading(false)
    }
    loadData()
  }, [groupId])

  if (isLoading) {
    return (
      <div className="section-container flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading members...</p>
        </div>
      </div>
    )
  }

  if (!group || !user) {
    return (
      <div className="section-container text-center py-20">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Unable to load members</h2>
        <p className="text-text-muted">Please try again later.</p>
      </div>
    )
  }

  const isOwner = group.ownerId === user.id
  const membersWithUsers = group.members?.map((member) => {
    const userData = mockUsers.find((u) => u.id === member.userId)
    return { ...member, user: userData }
  }) || []

  const sortedMembers = [...membersWithUsers].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 }
    return (roleOrder[a.role as keyof typeof roleOrder] || 3) - (roleOrder[b.role as keyof typeof roleOrder] || 3)
  })

  const handleRemoveMember = (memberId: string) => {
    if (confirm('Remove this member from the group?')) {
      removeMember(memberId)
    }
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    alert(`Invite sent to ${inviteEmail}! (Mock)`)
    setInviteEmail('')
    setShowInviteModal(false)
  }

  return (
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-velvet-royal/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-velvet-plum" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Members</h1>
              <p className="text-sm text-text-muted">{group.name} · {membersWithUsers.length} members</p>
            </div>
          </div>
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {/* Members List */}
        <div className="card-glass">
          <div className="divide-y divide-velvet-charcoal">
            {sortedMembers.map((member) => {
              const memberUser = member.user || { name: 'Unknown', email: '', avatar: undefined }
              const isCurrentUser = member.userId === user.id
              const isMemberOwner = member.role === 'owner'

              return (
                <motion.div
                  key={member.userId}
                  layout
                  className="flex items-center justify-between p-4 hover:bg-subCrack-tertiary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={memberUser.avatar}
                      alt={memberUser.name}
                      size="lg"
                      name={memberUser.name}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text-primary">{memberUser.name}</h3>
                        {isMemberOwner && <Crown className="h-4 w-4 text-accent-gold" />}
                        {member.role === 'admin' && <Shield className="h-4 w-4 text-velvet-plum" />}
                      </div>
                      <p className="text-sm text-text-muted">{memberUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMemberOwner && (
                      <span className="px-2 py-1 text-xs font-medium bg-accent-gold/10 text-accent-gold rounded-full">
                        Owner
                      </span>
                    )}
                    {member.role === 'admin' && !isMemberOwner && (
                      <span className="px-2 py-1 text-xs font-medium bg-velvet-plum/10 text-velvet-plum rounded-full">
                        Admin
                      </span>
                    )}
                    {member.role === 'member' && (
                      <span className="px-2 py-1 text-xs font-medium bg-subCrack-tertiary text-text-secondary rounded-full">
                        Member
                      </span>
                    )}

                    {!isCurrentUser && !isMemberOwner && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-2 rounded-lg hover:bg-status-error/10 text-text-muted hover:text-status-error transition-colors"
                        aria-label="Remove member"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-subCrack-primary/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="card-glass w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text-primary">Invite Member</h2>
                <button onClick={() => setShowInviteModal(false)} className="text-text-muted hover:text-text-primary">
                  <MoreVertical className="h-5 w-5 rotate-45" />
                </button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    placeholder="friend@example.com"
                    className="input w-full"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-subCrack-tertiary transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-muted text-subCrack-primary font-semibold text-sm hover:shadow-glow transition-all"
                  >
                    Send Invite
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  )
}