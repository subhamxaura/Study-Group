'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Settings, Users, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui'
import { AvatarGroup } from '@/components/ui'
import type { Group, GroupMember } from '@/types'

interface GroupHeaderProps {
  group: Group
  members: GroupMember[]
  onBack: () => void
  onSettings: () => void
}

export function GroupHeader({ group, members, onBack, onSettings }: GroupHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-strong p-4 rounded-2xl"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-subCrack-tertiary transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-velvet-royal/40 to-subCrack-secondary flex items-center justify-center">
              {group.avatar ? (
                <img src={group.avatar} alt={group.name} className="h-full w-full object-cover rounded-xl" />
              ) : (
                <span className="text-xl font-bold bg-gradient-to-r from-accent-gold to-accent-gold-muted bg-clip-text text-transparent">
                  {group.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">{group.name}</h1>
              <p className="text-sm text-text-muted">
                {group.members?.length || 0} members · {group.description || 'No description'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AvatarGroup
            avatars={members
              .filter((m) => m.user)
              .map((m) => ({
                name: m.user!.name,
                src: m.user!.avatar,
              }))}
            max={4}
          />
          <button
            onClick={onSettings}
            className="p-2 rounded-xl hover:bg-subCrack-tertiary transition-colors"
          >
            <Settings className="h-5 w-5 text-text-muted" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}