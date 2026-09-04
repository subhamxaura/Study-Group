'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/lib/store'
import { generateId } from '@/lib/utils'

export default function RegisterPage(){
  const router=useRouter(); const { setAuth }=useAuthStore()
  const [form,setForm]=useState({name:'',email:'',password:''}); const [show,setShow]=useState(false); const [submitting,setSubmitting]=useState(false)
  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault(); setSubmitting(true); await new Promise(r=> setTimeout(r,800))
    const u={ id: generateId(), name: form.name, email: form.email, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()}
    setAuth(u as any, generateId()); router.push('/groups')
  }
  return (
    <div className="min-h-screen bg-[rgb(var(--sg-background))] flex">
      <div className="hidden lg:flex flex-1 flex-col justify-between p-10 bg-white dark:bg-zinc-900 border-r">
        <Link href="/" className="flex items-center gap-2"><span className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">S</span><span className="font-semibold">Study-Group</span></Link>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">Create your workspace.</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[rgb(var(--sg-secondary))]">Start a study group, invite classmates and keep everything organized from day one.</p>
        </div>
        <p className="text-xs text-[rgb(var(--sg-muted))]">© {new Date().getFullYear()} Study-Group</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.28}} className="w-full max-w-[440px]">
          <Card className="p-6 sm:p-7">
            <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-[rgb(var(--sg-secondary))]">Join thousands of students studying together.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input label="Full name" placeholder="Aarav Sharma" value={form.name} onChange={e=> setForm(p=>({...p,name:e.target.value}))} required />
              <Input label="Email address" type="email" placeholder="you@university.edu" value={form.email} onChange={e=> setForm(p=>({...p,email:e.target.value}))} required />
              <div className="relative">
                <Input label="Password" type={show?'text':'password'} placeholder="At least 8 characters" value={form.password} onChange={e=> setForm(p=>({...p,password:e.target.value}))} required />
                <button type="button" onClick={()=> setShow(!show)} className="absolute right-2.5 top-[32px] p-1.5 rounded-md hover:bg-[rgb(var(--sg-hover))] text-[rgb(var(--sg-muted))]">{show?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button>
              </div>
              <Button type="submit" className="w-full" size="lg" isLoading={submitting} disabled={submitting}><UserPlus className="h-4 w-4"/> Create account</Button>
              <p className="text-xs text-center text-[rgb(var(--sg-muted))]">By creating an account you agree to our Terms and Privacy.</p>
            </form>
          </Card>
          <p className="mt-4 text-center text-sm text-[rgb(var(--sg-secondary))]">Already have an account? <Link href="/login" className="font-medium text-indigo-600 dark:text-indigo-400">Sign in</Link></p>
        </motion.div>
      </div>
    </div>
  )
}
