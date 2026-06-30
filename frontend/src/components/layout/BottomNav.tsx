'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Calendar, DollarSign,
  MoreHorizontal, Package, BarChart3, Settings, X
} from 'lucide-react'

const mainItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { href: '/schedule', icon: Calendar, label: 'Agenda' },
  { href: '/clients', icon: Users, label: 'Clientes' },
  { href: '/financial', icon: DollarSign, label: 'Financeiro' },
]

const moreItems = [
  { href: '/inventory', icon: Package, label: 'Estoque' },
  { href: '/reports', icon: BarChart3, label: 'Relatórios' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const isMoreActive = moreItems.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))

  return (
    <>
      {/* More sheet */}
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowMore(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-24 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-900 dark:text-white">Mais opções</p>
              <button onClick={() => setShowMore(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <item.icon size={22} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-stretch safe-bottom">
        {mainItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <item.icon size={20} className={isActive ? 'text-primary-600 dark:text-primary-400' : ''} />
              {item.label}
              {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-primary-500 rounded-t-full" />}
            </Link>
          )
        })}

        {/* Mais */}
        <button
          onClick={() => setShowMore(v => !v)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
            isMoreActive
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-400 dark:text-gray-500'
          )}
        >
          <MoreHorizontal size={20} />
          Mais
        </button>
      </nav>
    </>
  )
}
