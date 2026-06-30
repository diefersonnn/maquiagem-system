'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '@/lib/firestore'
import { formatCurrency, formatDateTime, formatTime } from '@/lib/utils'
import { DashboardData, STATUS_LABELS, STATUS_COLORS } from '@/types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts'
import {
  DollarSign, Users, TrendingUp, TrendingDown, Calendar,
  Clock, CheckCircle, Sparkles, Zap
} from 'lucide-react'

const COLORS = ['#d946ef', '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

function StatCard({
  title, value, subtitle, icon: Icon, color, trend
}: {
  title: string
  value: string
  subtitle?: string
  icon: any
  color: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const d = data!

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={24} className="text-primary-500" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{todayFormatted}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Hoje"
          value={formatCurrency(d?.revenue?.day || 0)}
          icon={DollarSign}
          color="bg-gradient-to-br from-primary-500 to-primary-600"
        />
        <StatCard
          title="Faturamento da Semana"
          value={formatCurrency(d?.revenue?.week || 0)}
          icon={TrendingUp}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Faturamento do Mês"
          value={formatCurrency(d?.revenue?.month || 0)}
          icon={TrendingUp}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Faturamento do Ano"
          value={formatCurrency(d?.revenue?.year || 0)}
          icon={TrendingUp}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Clientes"
          value={String(d?.totalClients || 0)}
          icon={Users}
          color="bg-gradient-to-br from-rose-500 to-rose-600"
        />
        <StatCard
          title="Despesas do Mês"
          value={formatCurrency(d?.expenses?.month || 0)}
          icon={TrendingDown}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        <StatCard
          title="Lucro Líquido do Mês"
          value={formatCurrency(d?.netProfit || 0)}
          subtitle={d?.netProfit >= 0 ? 'Resultado positivo ✓' : 'Atenção ao resultado'}
          icon={DollarSign}
          color={(d?.netProfit || 0) >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}
        />
      </div>

      {/* Card de projeção */}
      {((d?.projection?.day || 0) + (d?.projection?.month || 0)) > 0 && (
        <div className="card p-5 border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-amber-500" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Projeção de Faturamento</h3>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              Agendamentos pendentes
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">Ainda por receber hoje</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(d?.projection?.day || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Faturado hoje: <span className="font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(d?.revenue?.day || 0)}</span>
              </p>
              <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                {(() => {
                  const total = (d?.revenue?.day || 0) + (d?.projection?.day || 0)
                  const pct = total > 0 ? Math.round(((d?.revenue?.day || 0) / total) * 100) : 0
                  return (
                    <div className="h-full bg-gradient-to-r from-primary-500 to-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  )
                })()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Total projetado: <span className="font-semibold">{formatCurrency((d?.revenue?.day || 0) + (d?.projection?.day || 0))}</span>
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">Ainda por receber no mês</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(d?.projection?.month || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Faturado no mês: <span className="font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(d?.revenue?.month || 0)}</span>
              </p>
              <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                {(() => {
                  const total = (d?.revenue?.month || 0) + (d?.projection?.month || 0)
                  const pct = total > 0 ? Math.round(((d?.revenue?.month || 0) / total) * 100) : 0
                  return (
                    <div className="h-full bg-gradient-to-r from-primary-500 to-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  )
                })()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Total projetado: <span className="font-semibold">{formatCurrency((d?.revenue?.month || 0) + (d?.projection?.month || 0))}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="card p-5 xl:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Faturamento do Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d?.chartData || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d946ef" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Dia ${l}`} />
              <Area type="monotone" dataKey="value" stroke="#d946ef" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Services Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Serviços do Mês</h3>
          {d?.serviceRevenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={d.serviceRevenue}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {d.serviceRevenue.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend
                  formatter={(value) => <span className="text-xs">{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-gray-400 text-sm">
              Sem dados no mês
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Today's Appointments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-primary-500" />
              Agendamentos de Hoje
            </h3>
            <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-400">
              {d?.todayAppointments?.length || 0} agendamentos
            </span>
          </div>

          <div className="space-y-2">
            {d?.todayAppointments?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum agendamento hoje</p>
            ) : (
              d?.todayAppointments?.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="text-center min-w-[48px]">
                    <p className="text-sm font-bold text-primary-600">{formatTime(apt.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {apt.client?.firstName} {apt.client?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{apt.service?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(apt.value)}
                    </p>
                    <span className={`badge text-xs ${STATUS_COLORS[apt.status]}`}>
                      {STATUS_LABELS[apt.status]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar size={16} className="text-primary-500" />
              Próximos Atendimentos
            </h3>
          </div>

          <div className="space-y-2">
            {d?.upcomingAppointments?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum próximo agendamento</p>
            ) : (
              d?.upcomingAppointments?.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="text-center min-w-[64px]">
                    <p className="text-xs text-gray-400">
                      {new Date(apt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-sm font-bold text-primary-600">{formatTime(apt.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {apt.client?.firstName} {apt.client?.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{apt.service?.name}</p>
                  </div>
                  <span className={`badge text-xs ${STATUS_COLORS[apt.status]}`}>
                    {STATUS_LABELS[apt.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
