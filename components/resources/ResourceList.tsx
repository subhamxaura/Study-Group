'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter } from 'lucide-react'
import { ResourceCard } from './ResourceCard'
import { Resource } from '@/types'

interface ResourceListProps {
  resources: Resource[]
  userNames: Record<string, string>
  onResourceClick: (resource: Resource) => void
  onDeleteResource?: (resourceId: string) => void
}

export function ResourceList({ resources, userNames, onResourceClick, onDeleteResource }: ResourceListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const categories = Array.from(new Set(resources.map((r) => r.category).filter(Boolean))) as string[]

  const filteredResources = resources.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="input w-full pl-10"
          />
        </div>
        {categories.length > 0 && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input pl-10 pr-8 appearance-none"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Resource Grid */}
      <AnimatePresence mode="popLayout">
        {filteredResources.length > 0 ? (
          <motion.div layout className="space-y-3">
            {filteredResources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ResourceCard
                  resource={resource}
                  uploaderName={userNames[resource.uploadedBy]}
                  onClick={onResourceClick}
                  onDelete={onDeleteResource}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-text-muted">
              {search || categoryFilter !== 'all'
                ? 'No resources match your search.'
                : 'No resources yet. Share your first resource!'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
