'use client'
import { memo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Users, MessageCircle, Calendar, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { Group } from '@/types'
interface GroupCardProps { group: Group; isMember: boolean; onJoin: ()=>void; onLeave: ()=>void; onNavigate: ()=>void; index?: number }
function GroupCardInner({ group, isMember, onJoin, onLeave, onNavigate, index=0 }: GroupCardProps){
  const count = group.members?.length || 0
  const resourcesHref = `/groups/${group.id}/resources`
  return (
    <motion.div initial={{opacity:0, y:8}} animate={{opacity:1,y:0}} transition={{duration:0.2, delay: Math.min(index*0.03,0.18)}}>
      <div onClick={onNavigate} className="group h-full flex flex-col rounded-xl border bg-[rgb(var(--sg-card))] overflow-hidden hover:shadow-medium hover:-translate-y-[1px] transition-all cursor-pointer">
        <div className="h-28 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border-b relative overflow-hidden flex items-center justify-center">
          {group.avatar ? <img src={group.avatar} alt={group.name} loading="lazy" decoding="async" className="h-full w-full object-cover opacity-90" /> : <span className="text-3xl font-bold text-indigo-300 dark:text-indigo-400/60">{group.name[0]}</span>}
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 border shadow-sm px-2 py-1 text-xs font-medium"><Users className="h-3.5 w-3.5 text-[rgb(var(--sg-muted))]" />{count}</span>
          {isMember && <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-600 text-white text-[11px] font-medium px-2 py-1">Member</span>}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold leading-tight line-clamp-1 group-hover:text-indigo-600">{group.name}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--sg-secondary))] line-clamp-2 flex-1">{group.description}</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-[rgb(var(--sg-muted))] border-t pt-3">
            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />Chat</span>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Schedule</span>
            <Link href={resourcesHref} onClick={e=> e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-[rgb(var(--sg-foreground))]"><BookOpen className="h-3.5 w-3.5" />Resources</Link>
          </div>
          <div className="mt-3">
            {isMember ? <button onClick={e=>{e.stopPropagation(); onLeave()}} className="btn btn-secondary w-full btn-sm">Leave group</button> : <button onClick={e=>{e.stopPropagation(); onJoin()}} className="btn btn-primary w-full btn-sm">Join group</button>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
export const GroupCard = memo(GroupCardInner)
