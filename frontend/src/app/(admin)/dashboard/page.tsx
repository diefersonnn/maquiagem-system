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

const COLORS = ['#ec4899', '#e8a317', '#8b5cf6', '#06b6d4', '#10b981', '#f43f5e']

function StatCard({
  title, value, subtitle, icon: Icon, tint
}: {
  title: string
  value: string
  subtitle?: string
  icon: any
  tint: string
}) {
  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-lift transition-shadow duration-200">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${tint}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-500 dark:text-stone-400">{title}</p>
        <p className="text-2xl font-bold text-stone-900 dark:text-white mt-0.5 tabular-nums tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
    refetchInterval: 60000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 font-medium">Erro ao carregar o dashboard</p>
        <p className="text-sm text-stone-400">Verifique a conexão com o Firebase</p>
        <button onClick={() => refetch()} className="btn-secondary text-sm">Tentar novamente</button>
      </div>
    )
  }

  const d = data

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Sparkles size={22} className="text-primary-500" />
            Dashboard
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5 capitalize">{todayFormatted}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Hoje"
          value={formatCurrency(d?.revenue?.day || 0)}
          icon={DollarSign}
          tint="bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400"
        />
        <StatCard
          title="Faturamento da Semana"
          value={formatCurrency(d?.revenue?.week || 0)}
          icon={TrendingUp}
          tint="bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
        />
        <StatCard
          title="Faturamento do Mês"
          value={formatCurrency(d?.revenue?.month || 0)}
          icon={TrendingUp}
          tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        />
        <StatCard
          title="Faturamento do Ano"
          value={formatCurrency(d?.revenue?.year || 0)}
          icon={TrendingUp}
          tint="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Clientes"
          value={String(d?.totalClients || 0)}
          icon={Users}
          tint="bg-gold-50 text-gold-600 dark:bg-gold-950 dark:text-gold-400"
        />
        <StatCard
          title="Despesas do Mês"
          value={formatCurrency(d?.expenses?.month || 0)}
          icon={TrendingDown}
          tint="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
        />
        <StatCard
          title="Lucro Líquido do Mês"
          value={formatCurrency(d.netProfit ?? 0)}
          subtitle={(d.netProfit ?? 0) >= 0 ? 'Resultado positivo' : 'Atenção ao resultado'}
          icon={DollarSign}
          tint={(d.netProfit ?? 0) >= 0
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
            : 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'}
        />
      </div>

      {/* Card de projeção */}
      {((d?.projection?.day || 0) + (d?.projection?.month || 0)) > 0 && (
        <div className="card p-5 bg-gradient-to-br from-gold-50/70 via-white to-white dark:from-gold-950/30 dark:via-stone-900 dark:to-stone-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gold-100 dark:bg-gold-900/40 flex items-center justify-center">
              <Zap size={14} className="text-gold-600 dark:text-gold-400" />
            </div>
            <h3 className="font-semibold text-stone-800 dark:text-stone-200">Projeção de Faturamento</h3>
            <span className="text-xs bg-gold-100 dark:bg-gold-900/40 text-gold-700 dark:text-gold-400 px-2 py-0.5 rounded-full font-medium">
              Agendamentos pendentes
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-stone-100 dark:border-stone-800">
              <p className="text-xs text-stone-400 mb-1">Ainda por receber hoje</p>
              <p className="text-2xl font-bold text-gold-600 dark:text-gold-400 tabular-nums">
                {formatCurrency(d?.projection?.day || 0)}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Faturado hoje: <span className="font-semibold text-stone-600 dark:text-stone-300">{formatCurrency(d?.revenue?.day || 0)}</span>
              </p>
              <div className="mt-2 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                {(() => {
                  const total = (d?.revenue?.day || 0) + (d?.projection?.day || 0)
                  const pct = total > 0 ? Math.round(((d?.revenue?.day || 0) / total) * 100) : 0
                  return (
                    <div className="h-full bg-gradient-to-r from-primary-500 to-gold-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  )
                })()}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Total projetado: <span className="font-semibold">{formatCurrency((d?.revenue?.day || 0) + (d?.projection?.day || 0))}</span>
              </p>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-stone-100 dark:border-stone-800">
              <p className="text-xs text-stone-400 mb-1">Ainda por receber no mês</p>
              <p className="text-2xl font-bold text-gold-600 dark:text-gold-400 tabular-nums">
                {formatCurrency(d?.projection?.month || 0)}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Faturado no mês: <span className="font-semibold text-stone-600 dark:text-stone-300">{formatCurrency(d?.revenue?.month || 0)}</span>
              </p>
              <div className="mt-2 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                {(() => {
                  const total = (d?.revenue?.month || 0) + (d?.projection?.month || 0)
                  const pct = total > 0 ? Math.round(((d?.revenue?.month || 0) / total) * 100) : 0
                  return (
                    <div className="h-full bg-gradient-to-r from-primary-500 to-gold-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  )
                })()}
              </div>
              <p className="text-xs text-stone-400 mt-1">
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
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-4">Faturamento do Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d?.chartData || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Dia ${l}`} />
              <Area type="monotone" dataKey="value" stroke="#db2777" strokeWidth={2.5} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Services Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-4">Serviços do Mês</h3>
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
            <div className="flex items-center justify-center h-44 text-stone-400 text-sm">
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
            <h3 className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Clock size={16} className="text-primary-500" />
              Agendamentos de Hoje
            </h3>
            <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
              {d?.todayAppointments?.length || 0} agendamentos
            </span>
          </div>

          <div className="space-y-1.5">
            {d?.todayAppointments?.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">Nenhum agendamento hoje</p>
            ) : (
              d?.todayAppointments?.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
                >
                  <div className="text-center min-w-[48px]">
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatTime(apt.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                      {apt.client?.firstName} {apt.client?.lastName}
                    </p>
                    <p className="text-xs text-stone-400 truncate">{apt.service?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-stone-900 dark:text-white tabular-nums">
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
            <h3 className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Calendar size={16} className="text-primary-500" />
              Próximos Atendimentos
            </h3>
          </div>

          <div className="space-y-1.5">
            {d?.upcomingAppointments?.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">Nenhum próximo agendamento</p>
            ) : (
              d?.upcomingAppointments?.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
                >
                  <div className="text-center min-w-[64px]">
                    <p className="text-xs text-stone-400">
                      {new Date(apt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatTime(apt.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                      {apt.client?.firstName} {apt.client?.lastName}
                    </p>
                    <p className="text-xs text-stone-400 truncate">{apt.service?.name}</p>
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
