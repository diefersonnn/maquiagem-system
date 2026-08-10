'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Calendar, DollarSign,
  Package, BarChart3, Settings, LogOut, Sparkles, X
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clients', icon: Users, label: 'Clientes' },
  { href: '/schedule', icon: Calendar, label: 'Agenda' },
  { href: '/financial', icon: DollarSign, label: 'Financeiro' },
  { href: '/inventory', icon: Package, label: 'Estoque' },
  { href: '/reports', icon: BarChart3, label: 'Relatórios' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-gold-500 flex items-center justify-center shadow-lift">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-stone-900 dark:text-white text-sm tracking-tight">Blush</span>
            <p className="text-xs text-stone-400">Gestão Profissional</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-primary-50 to-primary-50/40 dark:from-primary-950 dark:to-primary-950/40 text-primary-700 dark:text-primary-300'
                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-gradient-to-b from-primary-500 to-gold-500" />
              )}
              <item.icon
                size={18}
                strokeWidth={isActive ? 2.25 : 1.75}
                className={cn(
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-stone-200/70 dark:border-stone-800">
        <div className="flex items-center gap-3 p-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-stone-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0 bg-white dark:bg-stone-900 border-r border-stone-200/70 dark:border-stone-800 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative flex flex-col w-60 h-screen bg-white dark:bg-stone-900">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
