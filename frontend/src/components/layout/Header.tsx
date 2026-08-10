'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '@/app/providers'
import { searchClientsLite } from '@/lib/firestore'
import { Client } from '@/types'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Client[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const clients = await searchClientsLite(searchQuery)
        setResults(clients as Client[])
        setShowResults(true)
      } catch {
        // ignore
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleClientClick = (id: string) => {
    setShowResults(false)
    setSearchQuery('')
    router.push(`/clients/${id}`)
  }

  return (
    <header className="h-16 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800 flex items-center px-4 gap-3 sticky top-0 z-20">
      {/* Mobile menu button — só aparece no tablet (md) antes do sidebar fixo */}
      <button
        onClick={onMenuToggle}
        className="hidden md:flex lg:hidden p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <Menu size={18} className="text-stone-500" />
      </button>

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-md relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Buscar clientes..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-stone-100/80 dark:bg-stone-800 border border-transparent rounded-xl
            focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:bg-white dark:focus:bg-stone-800 transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {showResults && searchQuery && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lift z-50 max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <p className="p-4 text-sm text-stone-500 text-center">Nenhum cliente encontrado</p>
            ) : (
              <div className="p-2">
                <p className="px-2 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wide">Clientes</p>
                {results.map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleClientClick(client.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 text-sm transition-colors"
                  >
                    <span className="font-medium text-stone-900 dark:text-white">{client.firstName} {client.lastName}</span>
                    <span className="text-stone-400 ml-2 text-xs">{client.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500"
        title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </header>
  )
}
