'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Lock, Globe } from 'lucide-react'
import { Modal } from '@/components/ui'
import { Input, Textarea } from '@/components/ui'
import { Button } from '@/components/ui'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; description: string; isPrivate: boolean }) => void
  isLoading?: boolean
}

export function CreateGroupModal({ isOpen, onClose, onSubmit, isLoading }: CreateGroupModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim()) {
      onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        isPrivate: formData.isPrivate,
      })
      setFormData({ name: '', description: '', isPrivate: true })
    }
  }

  const handleClose = () => {
    setFormData({ name: '', description: '', isPrivate: true })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Study Group">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Group Name"
          placeholder="e.g., Advanced Mathematics Study Group"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required
        />

        <Textarea
          label="Description (Optional)"
          placeholder="What will this group study? Add any relevant details..."
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Privacy</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isPrivate: true }))}
              className={`flex-1 p-4 rounded-xl border transition-all duration-200 ${
                formData.isPrivate
                  ? 'bg-velvet-royal/30 border-accent-gold/30 text-text-primary shadow-glow-purple'
                  : 'bg-subCrack-tertiary border-velvet-charcoal text-text-muted hover:border-accent-gold/20'
              }`}
            >
              <Lock className="h-5 w-5 mx-auto mb-2" />
              <span className="block text-sm font-medium">Private</span>
              <span className="text-xs text-text-muted">Invite only</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, isPrivate: false }))}
              className={`flex-1 p-4 rounded-xl border transition-all duration-200 ${
                !formData.isPrivate
                  ? 'bg-velvet-royal/30 border-accent-gold/30 text-text-primary shadow-glow-purple'
                  : 'bg-subCrack-tertiary border-velvet-charcoal text-text-muted hover:border-accent-gold/20'
              }`}
            >
              <Globe className="h-5 w-5 mx-auto mb-2" />
              <span className="block text-sm font-medium">Public</span>
              <span className="text-xs text-text-muted">Anyone can join</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-velvet-charcoal/50">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !formData.name.trim()}>
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-4 w-4 border-2 border-subCrack-primary border-t-transparent rounded-full"
                />
                Creating...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Create Group
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}