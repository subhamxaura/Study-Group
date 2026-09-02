'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Link2, FileText, X } from 'lucide-react'
import { Modal } from '@/components/ui'
import { Resource } from '@/types'
import { generateId } from '@/lib/utils'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  currentUserId: string
  onSave: (resource: Resource) => void
}

export function UploadModal({ isOpen, onClose, groupId, currentUserId, onSave }: UploadModalProps) {
  const [mode, setMode] = useState<'file' | 'link'>('link')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = ['Study Materials', 'Lecture Notes', 'Practice Problems', 'Solutions', 'External Links', 'External Tools']

  const resetForm = () => {
    setName('')
    setDescription('')
    setUrl('')
    setCategory('')
    setSelectedFile(null)
    setMode('link')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const resource: Resource = {
      id: `res-${generateId()}`,
      groupId,
      name: name.trim(),
      description: description.trim() || undefined,
      type: mode,
      url: mode === 'file' ? (selectedFile ? URL.createObjectURL(selectedFile) : '') : url,
      mimeType: selectedFile?.type,
      size: selectedFile?.size,
      category: category || undefined,
      uploadedBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onSave(resource)
    resetForm()
    onClose()
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      if (!name) setName(file.name.replace(/\.[^/.]+$/, ''))
      setMode('file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!name) setName(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose() }} title="Add Resource">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode Toggle */}
        <div className="flex gap-2 bg-subCrack-tertiary rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'link'
                ? 'bg-subCrack-card text-accent-gold shadow-velvet'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Link2 className="h-4 w-4" />
            Share Link
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'file'
                ? 'bg-subCrack-card text-accent-gold shadow-velvet'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
        </div>

        {/* File Drop Zone (file mode) */}
        {mode === 'file' && !selectedFile && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-accent-gold bg-accent-gold/5'
                : 'border-velvet-charcoal hover:border-accent-gold/50 hover:bg-subCrack-tertiary'
            }`}
          >
            <Upload className="h-8 w-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary mb-1">Drag & drop a file here</p>
            <p className="text-xs text-text-muted">or click to browse</p>
          </div>
        )}

        {/* Selected File */}
        {mode === 'file' && selectedFile && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-subCrack-tertiary border border-velvet-charcoal">
            <FileText className="h-5 w-5 text-accent-gold" />
            <span className="text-sm text-text-primary flex-1 truncate">{selectedFile.name}</span>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-1 rounded hover:bg-subCrack-card text-text-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Resource name"
            className="input w-full"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description (optional)"
            rows={2}
            className="input-field w-full resize-none"
          />
        </div>

        {/* URL (link mode) */}
        {mode === 'link' && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="input w-full"
              required
            />
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input w-full"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { resetForm(); onClose() }}
            className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-subCrack-tertiary transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-muted text-subCrack-primary font-semibold text-sm hover:shadow-glow transition-all"
          >
            {mode === 'file' ? 'Upload' : 'Add Link'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
