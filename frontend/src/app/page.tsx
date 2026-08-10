'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange } from '@/lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      router.replace(user ? '/dashboard' : '/login')
    })
    return unsub
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
