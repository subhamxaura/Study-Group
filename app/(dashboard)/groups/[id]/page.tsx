'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function GroupDashboardRoot() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  useEffect(() => {
    router.replace(`/groups/${groupId}/chat`)
  }, [groupId, router])

  return (
    <div className="section-container flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center">
        <div className="h-10 w-10 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted">Loading...</p>
      </div>
    </div>
  )
}
