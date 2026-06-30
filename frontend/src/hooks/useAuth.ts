'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth, login as firebaseLogin, logout as firebaseLogout } from '@/lib/auth'

export function useAuth() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser)
      setUser(fbUser ? { name: fbUser.displayName || fbUser.email || 'Admin', email: fbUser.email || '' } : null)
      setLoading(false)
    })
    return unsub
  }, [])

  const logout = async () => {
    await firebaseLogout()
    setUser(null)
    router.push('/login')
  }

  const login = async (email: string, password: string) => {
    const fbUser = await firebaseLogin(email, password)
    setUser({ name: fbUser.displayName || fbUser.email || 'Admin', email: fbUser.email || '' })
    return fbUser
  }

  return { user, firebaseUser, loading, logout, login }
}
