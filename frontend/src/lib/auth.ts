'use client'

import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from './firebase'

export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function logout() {
  await signOut(auth)
  if (typeof window !== 'undefined') window.location.href = '/login'
}

export function isAuthenticated(): boolean {
  return !!auth.currentUser
}

export function onAuthChange(cb: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, cb)
}

export function getCurrentUser() {
  return auth.currentUser
}

// Compatibilidade com código legado
export function getToken() { return null }
export function getUser() { return auth.currentUser ? { name: auth.currentUser.displayName || auth.currentUser.email, email: auth.currentUser.email } : null }
export function setAuth() {}
export function clearAuth() {}

