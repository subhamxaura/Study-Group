'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Calendar as CalendarIcon } from 'lucide-react'
import { CalendarView, EventCard, EventModal } from '@/components/calendar'
import { Button } from '@/components/ui'
import { useCalendarStore, useAuthStore, useGroupStore } from '@/lib/store'
import { mockGroups, mockEvents } from '@/lib/mockData'
import type { Event, Group } from '@/types'

export default function CalendarPage() {
  const params = useParams()
  const { user } = useAuthStore()
  const { events, setEvents, addEvent, updateEvent, removeEvent } = useCalendarStore()

  const groupId = params.id as string
  const [group, setGroup] = useState<Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewFilter, setViewFilter] = useState<'all' | 'upcoming' | 'past'>('all')

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
        setEvents(mockEvents[groupId] || [])
      }
      setIsLoading(false)
    }
    loadData()
  }, [groupId, setEvents])

  const filteredEvents = events.filter((e: Event) => {
    if (e.groupId !== groupId) return false
    const eventDate = new Date(e.startTime)
    const now = new Date()
    if (viewFilter === 'upcoming') return eventDate >= now
    if (viewFilter === 'past') return eventDate < now
    return true
  })

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleDateClick = (date: Date) => {
    setSelectedEvent(null)
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleCreateClick = () => {
    setSelectedEvent(null)
    setSelectedDate(null)
    setIsModalOpen(true)
  }

  const handleSave = (eventData: Partial<Event>) => {
    if (selectedEvent) {
      updateEvent({ ...selectedEvent, ...eventData } as Event)
    } else {
      addEvent(eventData as Event)
    }
  }

  if (isLoading) {
    return (
      <div className="section-container flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (!group || !user) {
    return (
      <div className="section-container text-center py-20">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Unable to load calendar</h2>
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
            <div className="h-10 w-10 rounded-xl bg-velvet-royal/20 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-velvet-plum" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
              <p className="text-sm text-text-muted">{group.name} events</p>
            </div>
          </div>
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-subCrack-tertiary rounded-xl p-1 mb-6 max-w-xs">
          {(['all', 'upcoming', 'past'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setViewFilter(filter)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                viewFilter === filter
                  ? 'bg-subCrack-card text-accent-gold shadow-velvet'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Calendar Grid */}
        <CalendarView
          events={filteredEvents}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />

        {/* Upcoming Events List */}
        {filteredEvents.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {viewFilter === 'all' ? 'All Events' : viewFilter === 'upcoming' ? 'Upcoming Events' : 'Past Events'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((event) => (
                  <EventCard key={event.id} event={event} onClick={handleEventClick} />
                ))}
            </div>
          </div>
        )}

        {filteredEvents.length === 0 && (
          <div className="mt-8 text-center py-12">
            <CalendarIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No events yet</h3>
            <p className="text-text-muted mb-4">Schedule your first study session!</p>
            <Button onClick={handleCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        )}

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedEvent(null)
            setSelectedDate(null)
          }}
          event={selectedEvent}
          selectedDate={selectedDate}
          groupId={groupId}
          currentUserId={user.id}
          onSave={handleSave}
        />
      </motion.div>
    </div>
  )
}
