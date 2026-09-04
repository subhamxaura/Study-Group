'use client'
import { useState, useMemo, useDeferredValue, memo, useCallback } from 'react'
import { Search, Plus, Grid, List, Users } from 'lucide-react'
import { Input, Button } from '@/components/ui'
import { GroupCard } from './GroupCard'
import type { Group } from '@/types'
interface GroupListProps { groups: Group[]; userGroups: Set<string>; onJoin:(id:string)=>void; onLeave:(id:string)=>void; onNavigate:(id:string)=>void; onCreate:()=>void; isLoading?: boolean }
function GroupListInner({ groups, userGroups, onJoin, onLeave, onNavigate, onCreate, isLoading }: GroupListProps){
  const [q,setQ]=useState(''); const dq=useDeferredValue(q); const [view,setView]=useState<'grid'|'list'>('grid'); const [filter,setFilter]=useState<'all'|'joined'|'public'>('all')
  const filtered = useMemo(()=>{
    const s=dq.trim().toLowerCase()
    return groups.filter(g=>{
      const m=!s||g.name.toLowerCase().includes(s)||g.description?.toLowerCase().includes(s)
      const mem=userGroups.has(g.id)
      const f=filter==='all'||(filter==='joined'&&mem)||(filter==='public'&&!mem)
      return m&&f
    })
  }, [groups,userGroups,dq,filter])
  const onSearch=useCallback((e:React.ChangeEvent<HTMLInputElement>)=> setQ(e.target.value),[])
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--sg-muted))]" />
          <Input placeholder="Search subjects, topics or groups…" value={q} onChange={onSearch} className="pl-9" aria-label="Search groups" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filter} onChange={e=> setFilter(e.target.value as any)} className="input w-auto py-2 text-sm h-9">
            <option value="all">All groups</option><option value="joined">My groups</option><option value="public">Discover</option>
          </select>
          <div className="flex items-center gap-1 rounded-lg border p-1 bg-[rgb(var(--sg-card))]">
            <button onClick={()=> setView('grid')} aria-pressed={view==='grid'} className={`p-1.5 rounded-md ${view==='grid'?'bg-[rgb(var(--sg-hover))] text-[rgb(var(--sg-foreground))]':'text-[rgb(var(--sg-muted))] hover:text-[rgb(var(--sg-foreground))]'}`}><Grid className="h-4 w-4"/></button>
            <button onClick={()=> setView('list')} aria-pressed={view==='list'} className={`p-1.5 rounded-md ${view==='list'?'bg-[rgb(var(--sg-hover))] text-[rgb(var(--sg-foreground))]':'text-[rgb(var(--sg-muted))]'}`}><List className="h-4 w-4"/></button>
          </div>
          <Button onClick={onCreate} size="sm"><Plus className="h-4 w-4" /> Create</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2,3,4,5].map(i=> <div key={i} className="h-[200px] rounded-xl border bg-[rgb(var(--sg-card))] animate-pulse" />)}
        </div>
      ) : filtered.length===0 ? (
        <div className="rounded-xl border bg-[rgb(var(--sg-card))] p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600"><Search className="h-6 w-6" /></div>
          <h3 className="mt-3 font-semibold">No groups found</h3>
          <p className="mt-1 text-sm text-[rgb(var(--sg-secondary))]">Try a different search or filter.</p>
          <button onClick={onCreate} className="mt-4 btn btn-primary btn-sm">Create a group</button>
        </div>
      ) : view==='grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g,i)=> <GroupCard key={g.id} group={g} isMember={userGroups.has(g.id)} onJoin={()=> onJoin(g.id)} onLeave={()=> onLeave(g.id)} onNavigate={()=> onNavigate(g.id)} index={i} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(g=>(
            <div key={g.id} className="flex items-center gap-4 rounded-xl border bg-[rgb(var(--sg-card))] p-3">
              <span className="h-11 w-11 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">{g.name[0]}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{g.name}</p><p className="text-xs text-[rgb(var(--sg-muted))] truncate">{g.description}</p><span className="text-xs text-[rgb(var(--sg-muted))] inline-flex items-center gap-1 mt-1"><Users className="h-3.5 w-3.5" />{g.members.length} members</span></div>
              <div className="shrink-0">{userGroups.has(g.id) ? <Button variant="danger" size="sm" onClick={()=> onLeave(g.id)}>Leave</Button> : <Button variant="primary" size="sm" onClick={()=> onJoin(g.id)}>Join</Button>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export const GroupList = memo(GroupListInner)
