'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Download, FileText, Trash2, MoreVertical } from 'lucide-react'
import { Resource } from '@/types'
import { formatRelativeTime, formatFileSize, getFileIcon } from '@/lib/utils'

interface ResourceCardProps {
  resource: Resource
  uploaderName?: string
  onClick: (resource: Resource) => void
  onDelete?: (resourceId: string) => void
}

export function ResourceCard({ resource, uploaderName, onClick, onDelete }: ResourceCardProps) {
  const isLink = resource.type === 'link'

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="card-glass-hover p-4 cursor-pointer group relative"
      onClick={() => onClick(resource)}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="h-12 w-12 rounded-xl bg-velvet-royal/20 flex items-center justify-center flex-shrink-0">
          {isLink ? (
            <ExternalLink className="h-6 w-6 text-velvet-plum" />
          ) : (
            <span className="text-2xl">
              {resource.mimeType ? getFileIcon(resource.mimeType) : '📎'}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary group-hover:text-accent-gold transition-colors truncate">
            {resource.name}
          </h3>
          {resource.description && (
            <p className="text-sm text-text-muted mt-1 line-clamp-2">{resource.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            {resource.category && (
              <span className="px-2 py-0.5 rounded-full bg-velvet-charcoal text-text-secondary">
                {resource.category}
              </span>
            )}
            {resource.size && <span>{formatFileSize(resource.size)}</span>}
            {uploaderName && <span>by {uploaderName}</span>}
            <span>{formatRelativeTime(resource.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isLink && (
            <button
              onClick={(e) => { e.stopPropagation() }}
              className="p-2 rounded-lg hover:bg-subCrack-tertiary text-text-muted hover:text-accent-gold transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          {isLink && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg hover:bg-subCrack-tertiary text-text-muted hover:text-accent-gold transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(resource.id) }}
              className="p-2 rounded-lg hover:bg-status-error/10 text-text-muted hover:text-status-error transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
