'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/lib/store'
import { mockUsers } from '@/lib/mockData'
import { generateId } from '@/lib/utils'

export default function LoginPage(){
  const router=useRouter()
  const { setAuth, isLoading }=useAuthStore()
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [show,setShow]=useState(false); const [error,setError]=useState(''); const [submitting,setSubmitting]=useState(false)
  useEffect(()=>{ if(useAuthStore.getState().user && !isLoading) router.push('/groups') },[isLoading,router])
  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError(''); setSubmitting(true); await new Promise(r=> setTimeout(r,700))
    const user=mockUsers.find(u=> u.email===email)
    if(user){ setAuth(user, generateId()); router.push('/groups') } else { setError('Invalid email. Use one of the demo accounts below.'); setSubmitting(false) }
  }
  const demo=async(id:string)=>{ setSubmitting(true); setError(''); await new Promise(r=> setTimeout(r,400)); const u=mockUsers.find(x=> x.id===id); if(u){ setAuth(u,generateId()); router.push('/groups') } }
  return (
    <div className="min-h-screen bg-[rgb(var(--sg-background))] flex">
      <div className="hidden lg:flex flex-1 flex-col justify-between p-10 bg-white dark:bg-zinc-900 border-r">
        <Link href="/" className="flex items-center gap-2"><span className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">S</span><span className="font-semibold">Study-Group</span></Link>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight leading-tight">A workspace for focused study, together.</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[rgb(var(--sg-secondary))]">Join groups, share resources, discuss concepts and keep momentum — one calm, organized place for learning.</p>
          <ul className="mt-6 space-y-2 text-sm text-[rgb(var(--sg-secondary))]">
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Organized groups by subject</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Chat, resources & schedule</li>
            <li className="flex gap-2"><span className="text-emerald-600">✓</span> Private & searchable</li>
          </ul>
        </div>
        <p className="text-xs text-[rgb(var(--sg-muted))]">© {new Date().getFullYear()} Study-Group • Privacy • Terms</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.28}} className="w-full max-w-[440px]">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-6"><span className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">S</span><span className="font-semibold">Study-Group</span></div>
          <Card className="p-6 sm:p-7">
            <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-[rgb(var(--sg-secondary))]">Sign in to your workspace.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input label="Email address" type="email" placeholder="you@university.edu" value={email} onChange={e=> setEmail(e.target.value)} required />
              <div className="relative">
                <Input label="Password" type={show?'text':'password'} placeholder="••••••••" value={password} onChange={e=> setPassword(e.target.value)} required />
                <button type="button" onClick={()=> setShow(!show)} className="absolute right-2.5 top-[32px] p-1.5 rounded-md hover:bg-[rgb(var(--sg-hover))] text-[rgb(var(--sg-muted))]" aria-label={show?'Hide':'Show'}>{show?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button>
              </div>
              {error && <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/20 text-red-700 dark:text-red-300 text-sm px-3 py-2">{error}</div>}
              <Button type="submit" className="w-full" size="lg" isLoading={submitting} disabled={submitting}><LogIn className="h-4 w-4" /> Sign in</Button>
            </form>
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs font-medium text-[rgb(var(--sg-muted))] uppercase tracking-widest">Demo accounts</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {mockUsers.slice(0,4).map(u=>(
                  <button key={u.id} onClick={()=> demo(u.id)} disabled={submitting} className="flex items-center gap-2 rounded-lg border bg-[rgb(var(--sg-card))] px-3 py-2 text-sm hover:bg-[rgb(var(--sg-hover))] text-left">
                    <img src={u.avatar} alt={u.name} className="h-7 w-7 rounded-full" loading="lazy" />
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-[rgb(var(--sg-muted))]">Any password works for demo accounts.</p>
            </div>
          </Card>
          <p className="mt-4 text-center text-sm text-[rgb(var(--sg-secondary))]">Don’t have an account? <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Create account</Link></p>
        </motion.div>
      </div>
    </div>
  )
}
