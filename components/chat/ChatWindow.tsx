'use client'
import { useEffect, useCallback } from 'react'
import { Search, Info } from 'lucide-react'
import { MessageList, TypingIndicator } from './MessageList'
import { MessageInput } from './MessageBubble'
import { useChatStore } from '@/lib/store'
import type { User } from '@/types'
interface ChatWindowProps { groupId: string; currentUserId: string; users: Record<string, User>; groupMembers: {userId:string; role:string}[] }
export function ChatWindow({ groupId, currentUserId, users, groupMembers }: ChatWindowProps){
  const { messages, isConnected, typingUsers, addMessage, setConnected, setTyping }=useChatStore()
  useEffect(()=>{
    setConnected(true)
    const interval=setInterval(()=>{
      if(Math.random()>0.95 && groupMembers.length>1){
        const others=groupMembers.filter(m=> m.userId!==currentUserId)
        if(others.length && users[others[0].userId]){
          const sender=others[Math.floor(Math.random()*others.length)]
          const samples=["Great question! Let me think about that...","I've been working on this too.","Does anyone have the study guide?","Meeting at the library later?","I'll share my notes in the resources section."]
          addMessage({ id:`msg-${Date.now()}`, groupId, userId: sender.userId, content: samples[Math.floor(Math.random()*samples.length)], type:'text', createdAt: new Date().toISOString()})
        }
      }
    },6000)
    return ()=>{ clearInterval(interval); setConnected(false) }
  },[groupId,currentUserId,groupMembers,users,addMessage,setConnected])

  const handleSend=useCallback((content:string)=>{ addMessage({ id:`msg-${Date.now()}`, groupId, userId: currentUserId, content, type:'text', createdAt: new Date().toISOString() }) },[groupId,currentUserId,addMessage])
  const handleTyping=useCallback((isTyping:boolean)=>{
    setTyping(currentUserId,isTyping)
  },[currentUserId,setTyping])
  const otherTypingUsers=Object.values(users).filter((u:User)=> typingUsers.has(u.id))
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[520px] rounded-xl border bg-[rgb(var(--sg-card))] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[rgb(var(--sg-surface-muted))] dark:bg-transparent">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">{groupMembers.length}</span>
          <div><h3 className="text-sm font-semibold">Discussion</h3><p className="text-xs text-[rgb(var(--sg-muted))] flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${isConnected?'bg-emerald-500':'bg-zinc-400'}`} />{isConnected?'Connected • ':'Connecting • '}{groupMembers.length} members</p></div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-[rgb(var(--sg-hover))] text-[rgb(var(--sg-muted))]"><Search className="h-4 w-4" /></button>
          <button className="p-2 rounded-lg hover:bg-[rgb(var(--sg-hover))] text-[rgb(var(--sg-muted))]"><Info className="h-4 w-4" /></button>
        </div>
      </div>
      <MessageList messages={messages.filter(m=> m.groupId===groupId)} currentUserId={currentUserId} users={users} />
      <TypingIndicator users={otherTypingUsers} />
      <MessageInput onSend={handleSend} placeholder={`Write a message…`} />
    </div>
  )
}
