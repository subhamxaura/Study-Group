'use client'

import { motion } from 'framer-motion'
import { MapPin, Clock, Users, Repeat } from 'lucide-react'
import { Event } from '@/types'
import { formatTime, formatDate } from '@/lib/utils'

interface EventCardProps {
  event: Event
  onClick: (event: Event) => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const goingCount = event.rsvps?.filter((r) => r.status === 'going').length || 0

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={() => onClick(event)}
      className="card-glass-hover p-4 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-text-primary group-hover:text-accent-gold transition-colors">
          {event.title}
        </h3>
        {event.isRecurring && (
          <Repeat className="h-4 w-4 text-text-muted flex-shrink-0 ml-2" />
        )}
      </div>

      <p className="text-sm text-text-muted mb-3 line-clamp-2">{event.description}</p>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {formatDate(event.startTime)} · {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <MapPin className="h-3.5 w-3.5" />
            <span>{event.location}</span>
          </div>
        )}

        {goingCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Users className="h-3.5 w-3.5" />
            <span>{goingCount} attending</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
