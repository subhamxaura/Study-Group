'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { BookOpen, Plus } from 'lucide-react'
import { ResourceList, UploadModal } from '@/components/resources'
import { Button } from '@/components/ui'
import { useResourceStore, useAuthStore, useGroupStore } from '@/lib/store'
import { mockGroups, mockUsers, mockResources } from '@/lib/mockData'
import type { Resource, Group } from '@/types'

export default function ResourcesPage() {
  const params = useParams()
  const { user } = useAuthStore()
  const { resources, setResources, addResource, removeResource } = useResourceStore()

  const groupId = params.id as string
  const [group, setGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

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
        setResources(mockResources[groupId] || [])
      }
      setIsLoading(false)
    }
    loadData()
  }, [groupId, setResources])

  const groupResources = resources.filter((r: Resource) => r.groupId === groupId)

  // Build a map of user names for display
  const userNames: Record<string, string> = {}
  mockUsers.forEach((u) => { userNames[u.id] = u.name })

  const handleSave = (resource: Resource) => {
    addResource(resource)
  }

  const handleDelete = (resourceId: string) => {
    removeResource(resourceId)
  }

  if (isLoading) {
    return (
      <div className="section-container flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading resources...</p>
        </div>
      </div>
    )
  }

  if (!group || !user) {
    return (
      <div className="section-container text-center py-20">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Unable to load resources</h2>
        <p className="text-text-muted">Please try again later.</p>
      </div>
    )
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
            <div className="h-10 w-10 rounded-xl bg-accent-silver/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-accent-silver" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Resources</h1>
              <p className="text-sm text-text-muted">
                {groupResources.length} resource{groupResources.length !== 1 ? 's' : ''} in {group.name}
              </p>
            </div>
          </div>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </div>

        {/* Resource List */}
        <ResourceList
          resources={groupResources}
          userNames={userNames}
          onResourceClick={(resource) => {
            if (resource.type === 'link') {
              window.open(resource.url, '_blank')
            }
          }}
          onDeleteResource={handleDelete}
        />

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          groupId={groupId}
          currentUserId={user.id}
          onSave={handleSave}
        />
      </motion.div>
    </div>
  )
}
