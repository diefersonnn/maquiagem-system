'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Moon, Sun, Menu, X } from 'lucide-react'
import { useTheme } from '@/app/providers'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Client, Appointment } from '@/types'

interface HeaderProps {
  onMenuToggle: () => void
}

interface SearchResults {
  clients: Client[]
  appointments: Appointment[]
  services: { id: string; name: string; price: number }[]
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
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
      setSearchResults(null)
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await api.get(`/reports/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(data)
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

  const hasResults = searchResults && (
    searchResults.clients.length > 0 ||
    searchResults.appointments.length > 0 ||
    searchResults.services.length > 0
  )

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 sticky top-0 z-20">
      {/* Mobile menu button — só aparece no tablet (md) antes do sidebar fixo */}
      <button
        onClick={onMenuToggle}
        className="hidden md:flex lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Menu size={18} className="text-gray-500" />
      </button>

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-md relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setShowResults(true)}
            placeholder="Buscar clientes, agendamentos..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {showResults && searchQuery && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
            {!hasResults ? (
              <p className="p-4 text-sm text-gray-500 text-center">Nenhum resultado encontrado</p>
            ) : (
              <div className="p-2">
                {searchResults!.clients.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Clientes</p>
                    {searchResults!.clients.map(client => (
                      <button
                        key={client.id}
                        onClick={() => handleClientClick(client.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">{client.firstName} {client.lastName}</span>
                        <span className="text-gray-400 ml-2 text-xs">{client.phone}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults!.appointments.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Agendamentos</p>
                    {searchResults!.appointments.map(apt => (
                      <button
                        key={apt.id}
                        onClick={() => { setShowResults(false); setSearchQuery(''); router.push('/schedule') }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">
                          {apt.client?.firstName} {apt.client?.lastName}
                        </span>
                        <span className="text-gray-400 ml-2 text-xs">{apt.service?.name} • {formatDate(apt.date)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
        title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </header>
  )
}
