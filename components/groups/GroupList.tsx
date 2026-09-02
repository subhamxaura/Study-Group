'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Filter, Grid, List, Users } from 'lucide-react'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import { GroupCard } from './GroupCard'
import type { Group } from '@/types'

interface GroupListProps {
  groups: Group[]
  userGroups: Set<string>
  onJoin: (groupId: string) => void
  onLeave: (groupId: string) => void
  onNavigate: (groupId: string) => void
  onCreate: () => void
  isLoading?: boolean
}

export function GroupList({ groups, userGroups, onJoin, onLeave, onNavigate, onCreate, isLoading }: GroupListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'joined' | 'public'>('all')

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const isMember = userGroups.has(group.id)
    const matchesFilter = selectedFilter === 'all' ||
      (selectedFilter === 'joined' && isMember) ||
      (selectedFilter === 'public' && !isMember)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-subCrack-tertiary"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'joined' | 'public')}
            className="input input-sm w-auto px-3 py-2 text-sm bg-subCrack-tertiary"
          >
            <option value="all">All Groups</option>
            <option value="joined">My Groups</option>
            <option value="public">Public Groups</option>
          </select>
          <div className="flex items-center gap-1 bg-subCrack-tertiary rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-subCrack-card text-accent-gold' : 'text-text-muted hover:text-text-primary'}`}
              aria-label="Grid view"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-subCrack-card text-accent-gold' : 'text-text-muted hover:text-text-primary'}`}
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          <Button onClick={onCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card animate-pulse">
              <div className="aspect-video bg-subCrack-tertiary" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-subCrack-tertiary w-3/4 rounded" />
                <div className="h-4 bg-subCrack-tertiary w-1/2 rounded" />
                <div className="h-4 bg-subCrack-tertiary w-full rounded" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-glass p-12 text-center"
        >
          <Search className="h-12 w-12 mx-auto text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No groups found</h3>
          <p className="text-text-muted mb-6">Try adjusting your search or filter criteria</p>
          <Button onClick={onCreate} variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Group
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredGroups.map((group, index) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isMember={userGroups.has(group.id)}
                  onJoin={() => onJoin(group.id)}
                  onLeave={() => onLeave(group.id)}
                  onNavigate={() => onNavigate(group.id)}
                  index={index}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filteredGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="card-glass-hover p-4 flex items-center gap-4"
                >
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-velvet-royal/30 to-subCrack-secondary flex items-center justify-center flex-shrink-0">
                    {group.avatar ? (
                      <img src={group.avatar} alt={group.name} className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-3xl font-bold bg-gradient-to-r from-accent-gold to-accent-gold-muted bg-clip-text text-transparent">
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-primary truncate">{group.name}</h4>
                    {group.description && <p className="text-sm text-text-muted truncate mt-1">{group.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {group.members?.length || 0} members
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {userGroups.has(group.id) ? (
                      <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onLeave(group.id); }}>
                        Leave
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onJoin(group.id); }}>
                        Join
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}