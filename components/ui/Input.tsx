'use client'
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; helperText?: string }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, helperText, id, ...props}, ref)=>{
  const inputId = id || label?.toLowerCase().replace(/\s+/g,'-')
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[rgb(var(--sg-foreground))]">{label}</label>}
      <input ref={ref} id={inputId} className={cn('input', error&&'input-error', className)} aria-invalid={error?'true':'false'} aria-describedby={error?`${inputId}-error`:helperText?`${inputId}-helper`:undefined} {...props}/>
      {error && <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      {helperText && !error && <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-[rgb(var(--sg-muted))]">{helperText}</p>}
    </div>
  )
})
Input.displayName='Input'
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string; helperText?: string }
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, helperText, id, ...props}, ref)=>{
  const textareaId = id || label?.toLowerCase().replace(/\s+/g,'-')
  return (
    <div className="w-full">
      {label && <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-[rgb(var(--sg-foreground))]">{label}</label>}
      <textarea ref={ref} id={textareaId} className={cn('input min-h-[100px] resize-y', error&&'input-error', className)} aria-invalid={error?'true':'false'} {...props}/>
      {error && <p className="mt-1.5 text-sm text-red-600" role="alert">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-[rgb(var(--sg-muted))]">{helperText}</p>}
    </div>
  )
})
Textarea.displayName='Textarea'
