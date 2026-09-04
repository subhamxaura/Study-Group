'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, Calendar, BookOpen, MessageCircle, Pin, Activity } from 'lucide-react'
import { useGroupStore } from '@/lib/store'
import { mockGroups, mockEvents, mockResources, mockUsers } from '@/lib/mockData'
import type { Group } from '@/types'

export default function GroupOverview(){
  const params=useParams(); const groupId=params.id as string
  const { currentGroup }=useGroupStore()
  const [group,setGroup]=useState<Group|null>(null); const [loading,setLoading]=useState(true)
  useEffect(()=>{
    let found = currentGroup?.id===groupId? currentGroup : useGroupStore.getState().groups.find(g=> g.id===groupId) || mockGroups.find(g=> g.id===groupId) || null
    setGroup(found); setLoading(false)
  },[groupId, currentGroup])
  if(loading) return <div className="section-container"><div className="h-40 rounded-xl border bg-[rgb(var(--sg-card))] animate-pulse" /></div>
  if(!group) return <div className="section-container text-center py-16"><p className="font-medium">Group not found.</p></div>
  const events = (mockEvents[groupId] || []).slice(0,3)
  const resources = (mockResources[groupId] || []).slice(0,3)
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="rounded-xl border bg-[rgb(var(--sg-card))] p-5 flex flex-col sm:flex-row gap-4">
        <span className="h-14 w-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0">{group.name[0]}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{group.name}</h1>
          <p className="text-sm text-[rgb(var(--sg-secondary))] mt-1 line-clamp-2">{group.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--sg-muted))]">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{group.members.length} members</span>
            <span>•</span><span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Link href={`/groups/${groupId}/chat`} className="btn btn-primary btn-sm"><MessageCircle className="h-4 w-4" /> Open discussion</Link>
          <Link href={`/groups/${groupId}/resources`} className="btn btn-secondary btn-sm"><BookOpen className="h-4 w-4" /> Resources</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-xl border bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 p-4 flex gap-3">
            <span className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0"><Pin className="h-4 w-4" /></span>
            <div><p className="text-sm font-semibold">Pinned announcement</p><p className="text-sm text-[rgb(var(--sg-secondary))] mt-1">Midterm review this Friday — bring your problem sets and questions. Room 204, 6PM.</p></div>
          </div>
          <div className="rounded-xl border bg-[rgb(var(--sg-card))] p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-[rgb(var(--sg-muted))]" /> Group activity</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex gap-2"><span className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">A</span><p className="text-[rgb(var(--sg-secondary))]"><span className="font-medium text-[rgb(var(--sg-foreground))]">Alex</span> shared a resource — “ODE cheat sheet” • 2h ago</p></div>
              <div className="flex gap-2"><span className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">J</span><p className="text-[rgb(var(--sg-secondary))]"><span className="font-medium text-[rgb(var(--sg-foreground))]">Jordan</span> joined the discussion • 5h ago</p></div>
              <div className="flex gap-2"><span className="h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs">T</span><p className="text-[rgb(var(--sg-secondary))]"><span className="font-medium text-[rgb(var(--sg-foreground))]">Taylor</span> completed “Problem set Ch.5” • 1d ago</p></div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border bg-[rgb(var(--sg-card))] p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-[rgb(var(--sg-muted))]" /> Upcoming sessions</h3>
            <div className="mt-3 space-y-2">
              {events.length ? events.map(ev=>(
                <div key={ev.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{ev.title}</p>
                  <p className="text-xs text-[rgb(var(--sg-muted))] mt-1">{new Date(ev.startTime).toLocaleString()} • {ev.location}</p>
                </div>
              )) : <p className="text-sm text-[rgb(var(--sg-muted))]">No sessions yet.</p>}
              <Link href={`/groups/${groupId}/calendar`} className="block text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-2">View calendar →</Link>
            </div>
          </div>
          <div className="rounded-xl border bg-[rgb(var(--sg-card))] p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-[rgb(var(--sg-muted))]" /> Pinned resources</h3>
            <div className="mt-3 space-y-2">
              {resources.length ? resources.map(r=>(
                <a key={r.id} href={r.url} target="_blank" className="block rounded-lg border p-3 hover:bg-[rgb(var(--sg-hover))] transition-colors">
                  <p className="text-sm font-medium line-clamp-1">{r.name}</p>
                  <p className="text-xs text-[rgb(var(--sg-muted))]">{r.type} • {r.category}</p>
                </a>
              )) : <p className="text-sm text-[rgb(var(--sg-muted))]">No resources yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
