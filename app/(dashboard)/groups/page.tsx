'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Clock, CheckSquare, CalendarDays, ArrowRight, Plus, Search } from 'lucide-react'
import { GroupList, CreateGroupModal } from '@/components/groups'
import { useGroupStore, useAuthStore } from '@/lib/store'
import { mockGroups, mockEvents, mockResources, mockMessages } from '@/lib/mockData'
import type { Group } from '@/types'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { groups, setGroups, addGroup } = useGroupStore()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await new Promise(r => setTimeout(r, 260))
      if (cancelled) return
      const { groups: persisted } = useGroupStore.getState()
      const ids = new Set(persisted.map(g => g.id))
      const merged = [...persisted, ...mockGroups.filter(g => !ids.has(g.id))]
      setGroups(merged)
      setIsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [setGroups])

  const userGroupIds = useMemo(() => new Set(groups.filter(g => g.members?.some(m => m.userId === user?.id)).map(g => g.id)), [groups, user?.id])
  const myGroups = useMemo(() => groups.filter(g => userGroupIds.has(g.id)), [groups, userGroupIds])

  const stats = useMemo(() => {
    const active = myGroups.length
    const upcoming = Object.values(mockEvents).flat().length
    return [
      { label: 'Active Groups', value: String(active), sub: `${active ? active + ' joined' : 'No groups yet'}`, icon: Users },
      { label: 'Study Hours', value: '24.5h', sub: '+3.2h this week', icon: Clock },
      { label: 'Tasks Completed', value: '12/18', sub: '67% completed', icon: CheckSquare },
      { label: 'Upcoming Sessions', value: String(upcoming), sub: 'Next in 2 hours', icon: CalendarDays },
    ]
  }, [myGroups])

  const upcomingSessions = useMemo(() => Object.values(mockEvents).flat().slice(0, 3), [])
  const recentActivity = useMemo(() => {
    const msgs = Object.values(mockMessages).flat().slice(0, 2).map(m => ({ type: 'message', text: m.content.slice(0, 64) + '…', time: '2h ago' }))
    const ress = Object.values(mockResources).flat().slice(0, 2).map(r => ({ type: 'resource', text: `Shared “${r.name}”`, time: '5h ago' }))
    return [...msgs, ...ress].slice(0, 4)
  }, [])

  const handleCreate = useCallback((data: { name: string; description: string; isPrivate: boolean }) => {
    const id = `group-${Date.now()}`
    const g: Group = { id, name: data.name, description: data.description, ownerId: user?.id || '', members: [{ userId: user?.id || '', groupId: id, role: 'owner', joinedAt: new Date().toISOString() }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    addGroup(g)
    useGroupStore.getState().setCurrentGroup(g)
    setIsCreateOpen(false)
    router.push(`/groups/${id}/chat`)
  }, [user?.id, addGroup, router])

  const handleJoin = useCallback((gid: string) => {
    const g = useGroupStore.getState().groups.find(x => x.id === gid)
    if (g && user) useGroupStore.getState().updateGroup({ ...g, members: [...g.members, { userId: user.id, groupId: gid, role: 'member' as const, joinedAt: new Date().toISOString() }] })
  }, [user])
  const handleLeave = useCallback((gid: string) => {
    const g = useGroupStore.getState().groups.find(x => x.id === gid)
    if (g && user) useGroupStore.getState().updateGroup({ ...g, members: g.members.filter(m => m.userId !== user.id) })
  }, [user])
  const navigate = useCallback((gid: string) => router.push(`/groups/${gid}`), [router])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
          <p className="mt-1 text-sm text-[rgb(var(--sg-secondary))]">Here’s what your study space looks like today.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> Create group</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border bg-[rgb(var(--sg-card))] p-4">
            <div className="flex items-center justify-between">
              <span className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300"><s.icon className="h-4 w-4" /></span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline">• Active</span>
            </div>
            <p className="mt-3 text-xs text-[rgb(var(--sg-muted))]">{s.label}</p>
            <p className="text-xl font-semibold">{s.value}</p>
            <p className="text-xs text-[rgb(var(--sg-muted))]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1.7fr_0.9fr] gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Your Study Groups</h2>
            <span className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">{myGroups.length} groups</span>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[0,1,2,3].map(i=> <div key={i} className="h-[180px] rounded-xl border bg-[rgb(var(--sg-card))] animate-pulse" />)}
            </div>
          ) : myGroups.length === 0 ? (
            <div className="rounded-xl border bg-[rgb(var(--sg-card))] p-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600"><Users className="h-6 w-6" /></div>
              <h3 className="mt-3 font-semibold">You haven’t joined any study groups yet.</h3>
              <p className="mt-1 text-sm text-[rgb(var(--sg-secondary))] max-w-sm mx-auto">Discover groups by subject or create your own. Invite classmates and start collaborating.</p>
              <button onClick={() => setIsCreateOpen(true)} className="mt-4 btn btn-primary btn-sm">Discover Groups <ArrowRight className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {myGroups.slice(0,4).map((g,idx)=>(
                <motion.div key={g.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay: idx*0.04}} onClick={()=> navigate(g.id)} className="group cursor-pointer rounded-xl border bg-[rgb(var(--sg-card))] p-4 hover:shadow-medium hover:-translate-y-[1px] transition-all">
                  <div className="flex items-start gap-3">
                    <span className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">{g.name[0]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate group-hover:text-indigo-600">{g.name}</p>
                      <p className="text-xs text-[rgb(var(--sg-muted))] truncate">{g.description.slice(0, 56)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-[rgb(var(--sg-muted))]">
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{g.members.length} members</span>
                    <span>•</span><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-[rgb(var(--sg-hover))] overflow-hidden"><span className="block h-full bg-indigo-600" style={{width: `${48 + (idx*11)%52}%`}} /></div>
                  <p className="mt-2 text-xs text-[rgb(var(--sg-muted))]">Next session • Tomorrow 6:00 PM</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Discover preview */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Discover Groups</h3>
              <span className="text-xs text-[rgb(var(--sg-muted))]">{groups.length} total</span>
            </div>
            <GroupList groups={groups} userGroups={userGroupIds} onJoin={handleJoin} onLeave={handleLeave} onNavigate={navigate} onCreate={()=> setIsCreateOpen(true)} isLoading={isLoading} />
          </div>
        </div>

        <div className="space-y-4">
          {/* Upcoming */}
          <div className="rounded-xl border bg-[rgb(var(--sg-card))] p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[rgb(var(--sg-muted))]" /> Upcoming</h3>
            {upcomingSessions.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">Your schedule is clear.</p>
                <p className="text-xs text-[rgb(var(--sg-muted))] mt-1">No sessions scheduled. Create one to stay ahead.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {upcomingSessions.map(ev=>(
                  <div key={ev.id} className="rounded-lg border p-3 hover:bg-[rgb(var(--sg-hover))] transition-colors">
                    <p className="text-sm font-medium leading-tight">{ev.title}</p>
                    <p className="text-xs text-[rgb(var(--sg-muted))] mt-1 line-clamp-1">{ev.description}</p>
                    <p className="text-xs text-[rgb(var(--sg-muted))] mt-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(ev.startTime).toLocaleString()} • {ev.location}</p>
                  </div>
                ))}
                <button className="w-full mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-300">View schedule →</button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border bg-[rgb(var(--sg-card))] p-4">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <div className="mt-3 space-y-3">
              {recentActivity.map((a,i)=>(
                <div key={i} className="flex gap-3">
                  <span className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${a.type==='message' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20'}`}>{a.type==='message'?'M':'R'}</span>
                  <div className="min-w-0"><p className="text-sm leading-snug text-[rgb(var(--sg-secondary))]">{a.text}</p><p className="text-xs text-[rgb(var(--sg-muted))]">{a.time}</p></div>
                </div>
              ))}
              {recentActivity.length===0 && <p className="text-sm text-[rgb(var(--sg-muted))]">No recent activity.</p>}
            </div>
          </div>
        </div>
      </div>

      <CreateGroupModal isOpen={isCreateOpen} onClose={()=> setIsCreateOpen(false)} onSubmit={handleCreate} />
    </div>
  )
}
