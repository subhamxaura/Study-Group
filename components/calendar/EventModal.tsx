'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Calendar, Clock, MapPin, FileText, Repeat } from 'lucide-react'
import { Modal } from '@/components/ui'
import { Event } from '@/types'
import { generateId } from '@/lib/utils'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event?: Event | null
  selectedDate?: Date | null
  groupId: string
  currentUserId: string
  onSave: (event: Event) => void
}

export function EventModal({
  isOpen,
  onClose,
  event,
  selectedDate,
  groupId,
  currentUserId,
  onSave,
}: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    if (event) {
      setTitle(event.title)
      setDescription(event.description)
      const start = new Date(event.startTime)
      const end = new Date(event.endTime)
      setStartDate(start.toISOString().split('T')[0])
      setStartTime(start.toTimeString().slice(0, 5))
      setEndDate(end.toISOString().split('T')[0])
      setEndTime(end.toTimeString().slice(0, 5))
      setLocation(event.location || '')
      setIsRecurring(event.isRecurring)
    } else {
      setTitle('')
      setDescription('')
      const baseDate = selectedDate || new Date()
      const end = new Date(baseDate.getTime() + 2 * 60 * 60 * 1000)
      setStartDate(baseDate.toISOString().split('T')[0])
      setStartTime('18:00')
      setEndDate(end.toISOString().split('T')[0])
      setEndTime('20:00')
      setLocation('')
      setIsRecurring(false)
    }
  }, [event, selectedDate, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const startDT = new Date(`${startDate}T${startTime}`)
    const endDT = new Date(`${endDate}T${endTime}`)

    onSave({
      id: event?.id || `event-${generateId()}`,
      groupId,
      title: title.trim(),
      description: description.trim(),
      startTime: startDT.toISOString(),
      endTime: endDT.toISOString(),
      location: location.trim() || undefined,
      isRecurring,
      createdBy: event?.createdBy || currentUserId,
      createdAt: event?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rsvps: event?.rsvps || [],
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? 'Edit Event' : 'Create Event'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
            <FileText className="h-4 w-4" />
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Study session, exam review, etc."
            className="input w-full"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will we cover?"
            rows={3}
            className="input-field w-full resize-none"
          />
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
              <Calendar className="h-4 w-4" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
              <Clock className="h-4 w-4" />
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
              <Calendar className="h-4 w-4" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
              <Clock className="h-4 w-4" />
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input w-full"
              required
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
            <MapPin className="h-4 w-4" />
            Location (optional)
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Library Room 204, Online - Zoom, etc."
            className="input w-full"
          />
        </div>

        {/* Recurring */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`relative w-10 h-5 rounded-full transition-colors ${isRecurring ? 'bg-accent-gold' : 'bg-velvet-charcoal'}`}>
            <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-5' : ''}`} />
          </div>
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-text-muted" />
            <span className="text-sm text-text-secondary">Recurring event</span>
          </div>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-subCrack-tertiary transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-muted text-subCrack-primary font-semibold text-sm hover:shadow-glow transition-all"
          >
            {event ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
