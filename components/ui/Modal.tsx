'use client'
import { Fragment, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
interface ModalProps { isOpen: boolean; onClose: ()=>void; title?: string; description?: string; children: ReactNode; size?: 'sm'|'md'|'lg'|'xl'|'full'; showCloseButton?: boolean; closeOnOverlayClick?: boolean; className?: string }
export function Modal({ isOpen, onClose, title, description, children, size='md', showCloseButton=true, closeOnOverlayClick=true, className }: ModalProps){
  const sizeCls = { sm:'max-w-sm', md:'max-w-md', lg:'max-w-lg', xl:'max-w-xl', full:'max-w-4xl'}[size]
  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={closeOnOverlayClick?onClose:undefined} aria-hidden="true"/>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0, scale:0.98, y:8}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.98, y:8}} transition={{duration:0.18}} className={cn('w-full bg-[rgb(var(--sg-card))] border border-[rgb(var(--sg-border))] rounded-xl shadow-large overflow-hidden', sizeCls, className)} role="dialog" aria-modal="true" aria-labelledby={title?'modal-title':undefined}>
              {(title||showCloseButton) && (
                <div className="flex items-start justify-between p-5 border-b border-[rgb(var(--sg-border))]">
                  <div>{title && <h2 id="modal-title" className="text-base font-semibold">{title}</h2>}{description && <p className="mt-1 text-sm text-[rgb(var(--sg-muted))]">{description}</p>}</div>
                  {showCloseButton && <button onClick={onClose} className="p-1.5 rounded-lg text-[rgb(var(--sg-muted))] hover:text-[rgb(var(--sg-foreground))] hover:bg-[rgb(var(--sg-hover))] transition-colors" aria-label="Close modal"><X className="h-5 w-5"/></button>}
                </div>
              )}
              <div className="p-5">{children}</div>
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>
  )
}
interface ConfirmModalProps { isOpen: boolean; onClose: ()=>void; onConfirm: ()=>void; title: string; message: string; confirmText?: string; cancelText?: string; variant?: 'danger'|'primary'; isLoading?: boolean }
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText='Confirm', cancelText='Cancel', variant='primary', isLoading }: ConfirmModalProps){
  return <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"><p className="text-sm text-[rgb(var(--sg-secondary))] mb-6 leading-relaxed">{message}</p><div className="flex justify-end gap-2"><button onClick={onClose} disabled={isLoading} className="btn btn-ghost btn-sm">{cancelText}</button><button onClick={onConfirm} disabled={isLoading} className={variant==='danger'?'btn btn-danger btn-sm':'btn btn-primary btn-sm'}>{isLoading?'Processing...':confirmText}</button></div></Modal>
}
