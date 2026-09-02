'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Save, Trash2, AlertTriangle, Edit } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { Button, Input } from '@/components/ui'
import { useGroupStore, useAuthStore } from '@/lib/store'
import { mockGroups } from '@/lib/mockData'
import type { Group } from '@/types'

export default function GroupSettingsPage() {
  const params = useParams()
  const { user } = useAuthStore()
  const { currentGroup, updateGroup, removeGroup } = useGroupStore()

  const groupId = params.id as string
  const [group, setGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      await new Promise((r) => setTimeout(r, 300))
      const { currentGroup, groups } = useGroupStore.getState()
      let foundGroup = currentGroup?.id === groupId ? currentGroup : null
      if (!foundGroup) {
        foundGroup = groups.find((g) => g.id === groupId) || null
      }
      if (!foundGroup) {
        foundGroup = mockGroups.find((g) => g.id === groupId) || null
      }
      if (foundGroup) {
        setGroup(foundGroup)
        setName(foundGroup.name)
        setDescription(foundGroup.description)
      }
      setIsLoading(false)
    }
    loadData()
  }, [groupId])

  const isOwner = group?.ownerId === user?.id

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !isOwner) return

    updateGroup({
      ...group,
      name: name.trim(),
      description: description.trim(),
      updatedAt: new Date().toISOString(),
    })
  }

  const handleDelete = () => {
    if (group) {
      removeGroup(group.id)
    }
  }

  if (isLoading) {
    return (
      <div className="section-container flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!group || !user || !isOwner) {
    return (
      <div className="section-container text-center py-20">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Access Denied</h2>
        <p className="text-text-muted">Only the group owner can access settings.</p>
      </div>
    )
  }

  return (
    <div className="section-container max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Group Settings</h1>
          <p className="text-text-muted">Manage your study group details</p>
        </div>

        {/* Group Info Card */}
        <div className="card-glass p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Group Information
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium text-text-secondary mb-1.5">
                Group Name
              </label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                className="w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="group-description" className="block text-sm font-medium text-text-secondary mb-1.5">
                Description
              </label>
              <textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group about?"
                rows={4}
                className="input w-full resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-muted text-subCrack-primary font-semibold text-sm hover:shadow-glow transition-all"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Group Avatar Card */}
        <div className="card-glass p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            Group Avatar
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar
                src={group.avatar}
                alt={group.name}
                size="xl"
                name={group.name}
              />
            </div>
            <div className="text-sm text-text-muted">
              <p>Avatar upload coming soon</p>
              <p className="text-xs mt-1">Currently using a placeholder image</p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card-glass p-6 border border-status-error/20">
          <h2 className="text-lg font-semibold text-status-error mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </h2>
          <p className="text-text-muted mb-4">
            Deleting this group is irreversible. All messages, events, and resources will be permanently removed.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-error/10 text-status-error font-medium text-sm hover:bg-status-error/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete Group
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-subCrack-primary/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="card-glass w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 text-status-error mb-4">
                <AlertTriangle className="h-6 w-6" />
                <h2 className="text-xl font-bold text-text-primary">Delete Group?</h2>
              </div>
              <p className="text-text-muted mb-6">
                Are you sure you want to delete <strong className="text-text-primary">{group.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-subCrack-tertiary transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-2 rounded-xl bg-status-error text-white font-semibold text-sm hover:shadow-red transition-all"
                >
                  Delete Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  )
}