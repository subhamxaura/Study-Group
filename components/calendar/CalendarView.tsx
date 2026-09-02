'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { Event } from '@/types'
import { formatDate } from '@/lib/utils'

interface CalendarViewProps {
  events: Event[]
  onEventClick: (event: Event) => void
  onDateClick: (date: Date) => void
}

export function CalendarView({ events, onEventClick, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  return (
    <div className="card-glass p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-text-muted py-2">
            {day}
          </div>
        ))}

        {/* Padding for first week */}
        {paddingDays.map((i) => (
          <div key={`pad-${i}`} />
        ))}

        {/* Calendar Days */}
        {days.map((day) => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
          const dayEvents = events.filter(
            (e) => new Date(e.startTime).toDateString() === date.toDateString()
          )
          const isToday = new Date().toDateString() === date.toDateString()

          return (
            <motion.div
              key={day}
              whileHover={{ scale: 1.05 }}
              onClick={() => onDateClick(date)}
              className={`min-h-[100px] p-2 border rounded-xl cursor-pointer transition-colors ${
                isToday
                  ? 'border-accent-gold/50 bg-accent-gold/5'
                  : 'border-velvet-charcoal hover:bg-subCrack-tertiary'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-accent-gold' : 'text-text-primary'}`}>
                {day}
              </div>
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                    className="text-xs px-1.5 py-0.5 rounded bg-velvet-royal/20 text-velvet-plum truncate hover:bg-velvet-royal/30 transition-colors"
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
