'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Users, MessageCircle, Calendar, BookOpen, Lock } from 'lucide-react'
import { Card } from '@/components/ui'
import { Badge } from '@/components/ui'
import type { Group } from '@/types'

interface GroupCardProps {
  group: Group
  isMember: boolean
  onJoin: () => void
  onLeave: () => void
  onNavigate: () => void
  index?: number
}

export function GroupCard({ group, isMember, onJoin, onLeave, onNavigate, index = 0 }: GroupCardProps) {
  const memberCount = group.members?.length || 0
  const resourcesHref = `/groups/${group.id}/resources`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
    >
      <Card variant="glass" hover className="group h-full flex flex-col cursor-pointer overflow-hidden" onClick={onNavigate}>
        {/* Premium header with subtle violet/blue bloom */}
        <div className="relative">
          <div className="aspect-video w-full relative overflow-hidden bg-[radial-gradient(600px_240px_at_30%_10%,rgba(155,0,255,0.22),transparent_70%),radial-gradient(520px_220px_at_85%_20%,rgba(24,0,255,0.16),transparent_68%),linear-gradient(145deg,#0E0B1E,#07070D)]">
            {group.avatar ? (
              <img
                src={group.avatar}
                alt={group.name}
                className="h-full w-full object-cover opacity-[0.34] group-hover:opacity-[0.48] transition-opacity duration-500 mix-blend-luminosity"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-bold text-white/10 tracking-tight">{group.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            {/* Subtle neural filament hint — CSS only, no canvas for perf on cards */}
            <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" style={{ background: 'linear-gradient(100deg, transparent 30%, rgba(208,0,255,0.18) 50%, transparent 70%)', filter: 'blur(6px)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-[#020203]/45 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="purple" className="gap-1.5 backdrop-blur">
                  <Users className="h-3 w-3" />
                  <span>{memberCount}</span>
                </Badge>
                {group.description && (
                  <Link href={resourcesHref} onClick={(e) => e.stopPropagation()}>
                    <Badge variant="silver" className="gap-1.5 hover:border-white/15 hover:text-white">
                      <BookOpen className="h-3 w-3" />
                      <span>Resources</span>
                    </Badge>
                  </Link>
                )}
              </div>
              {isMember && (
                <Badge variant="gold" className="gap-1.5 backdrop-blur">
                  <Lock className="h-3 w-3" />
                  <span>Member</span>
                </Badge>
              )}
            </div>
          </div>
          {/* Top soft glow line */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9B00FF]/35 to-transparent opacity-60" />
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#D8C6FF] transition-colors">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-white/55 text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">
              {group.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-white/40 border-t border-white/[0.06] pt-4">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </span>
            <Link
              href={resourcesHref}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 hover:text-white/80 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Resources
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            {isMember ? (
              <button
                onClick={(e) => { e.stopPropagation(); onLeave(); }}
                className="btn btn-danger w-full btn-sm"
              >
                Leave Group
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onJoin(); }}
                className="btn btn-primary w-full btn-sm"
              >
                Join Group
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
