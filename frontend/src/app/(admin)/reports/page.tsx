'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFinancials, getAppointments, getClients, getPaymentMethods } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart3, TrendingUp, Users, Scissors, Filter,
  Trophy, DollarSign
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

const COLORS = ['#d946ef', '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6']

type Period = 'month' | 'year' | 'custom'

function getPeriodDates(period: Period, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date()
  switch (period) {
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date() }
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date() }
    case 'custom':
      return {
        start: customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1),
        end: customEnd ? new Date(customEnd + 'T23:59:59') : new Date(),
      }
  }
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'clients' | 'services'>('financial')
  const [period, setPeriod] = useState<Period>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { start, end } = getPeriodDates(period, customStart, customEnd)

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', activeTab, period, customStart, customEnd],
    queryFn: async () => {
      const [financials, appointments, clients, paymentMethods] = await Promise.all([
        getFinancials(start, end) as Promise<any[]>,
        getAppointments(start, end) as Promise<any[]>,
        getClients() as Promise<any[]>,
        getPaymentMethods() as Promise<any[]>,
      ])

      const completedApts = appointments.filter(a => a.status === 'COMPLETED')

      // ── Financial report ─────────────────────────────────────────────────
      const totalIncome = financials.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.value, 0)
      const totalExpenses = financials.filter(f => f.type === 'EXPENSE').reduce((s, f) => s + f.value, 0)
      const netProfit = totalIncome - totalExpenses

      const pmMap: Record<string, string> = {}
      paymentMethods.forEach((pm: any) => { pmMap[pm.id] = pm.name })

      const byPmAcc: Record<string, number> = {}
      financials.filter(f => f.type === 'INCOME' && f.paymentMethodId).forEach(f => {
        const name = pmMap[f.paymentMethodId] || f.paymentMethodId
        byPmAcc[name] = (byPmAcc[name] || 0) + f.value
      })
      const byPaymentMethod = Object.entries(byPmAcc).map(([name, value]) => ({ name, value }))

      // ── Clients report ───────────────────────────────────────────────────
      const clientMap: Record<string, any> = {}
      clients.forEach((c: any) => { clientMap[c.id] = c })

      const clientStats: Record<string, { id: string; name: string; phone: string; totalAppointments: number; totalSpent: number }> = {}
      completedApts.forEach((apt: any) => {
        if (!apt.clientId) return
        if (!clientStats[apt.clientId]) {
          const c = clientMap[apt.clientId]
          clientStats[apt.clientId] = {
            id: apt.clientId,
            name: c ? `${c.firstName} ${c.lastName}` : 'Desconhecido',
            phone: c?.phone || '',
            totalAppointments: 0,
            totalSpent: 0,
          }
        }
        clientStats[apt.clientId].totalAppointments++
        clientStats[apt.clientId].totalSpent += apt.value || 0
      })

      const clientList = Object.values(clientStats)
      const topByFrequency = [...clientList].sort((a, b) => b.totalAppointments - a.totalAppointments)
      const topBySpending = [...clientList].sort((a, b) => b.totalSpent - a.totalSpent)

      // ── Services report ──────────────────────────────────────────────────
      const serviceStats: Record<string, { name: string; count: number; total: number }> = {}
      completedApts.forEach((apt: any) => {
        const name = apt.service?.name || apt.serviceId || 'Desconhecido'
        if (!serviceStats[name]) serviceStats[name] = { name, count: 0, total: 0 }
        serviceStats[name].count++
        serviceStats[name].total += apt.value || 0
      })

      const serviceList = Object.values(serviceStats)
      const mostPerformed = [...serviceList].sort((a, b) => b.count - a.count)
      const mostProfitable = [...serviceList].sort((a, b) => b.total - a.total).map(s => ({
        ...s,
        average: s.count > 0 ? s.total / s.count : 0,
      }))

      return { totalIncome, totalExpenses, netProfit, byPaymentMethod, topByFrequency, topBySpending, mostPerformed, mostProfitable }
    },
  })

  const PERIOD_LABELS: Record<Period, string> = { month: 'Este Mês', year: 'Este Ano', custom: 'Personalizado' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-primary-500" />
          Relatórios
        </h1>
      </div>

      {/* Filters */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(['month', 'year', 'custom'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors
                ${period === p ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-50'}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="input py-1.5 text-sm w-36" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span className="text-gray-400 text-sm">até</span>
            <input type="date" className="input py-1.5 text-sm w-36" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          ['financial', TrendingUp, 'Financeiro'],
          ['clients', Users, 'Clientes'],
          ['services', Scissors, 'Serviços'],
        ] as [typeof activeTab, any, string][]).map(([tab, Icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reportData ? (
        <>
          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5">
                  <p className="text-sm text-gray-500">Total Faturado</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(reportData.totalIncome)}</p>
                </div>
                <div className="card p-5">
                  <p className="text-sm text-gray-500">Total Gasto</p>
                  <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(reportData.totalExpenses)}</p>
                </div>
                <div className="card p-5">
                  <p className="text-sm text-gray-500">Lucro Líquido</p>
                  <p className={`text-2xl font-bold mt-1 ${reportData.netProfit >= 0 ? 'text-primary-600' : 'text-red-500'}`}>
                    {formatCurrency(reportData.netProfit)}
                  </p>
                </div>
              </div>

              {reportData.byPaymentMethod?.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Receitas por Forma de Pagamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={reportData.byPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                          {reportData.byPaymentMethod.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {reportData.byPaymentMethod.map((pm: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{pm.name}</span>
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(pm.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" />
                    Clientes que Mais Retornam
                  </h3>
                  <div className="space-y-3">
                    {reportData.topByFrequency?.slice(0, 8).map((c: any, i: number) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                          ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{c.totalAppointments}x</p>
                          <p className="text-xs text-gray-400">{formatCurrency(c.totalSpent)}</p>
                        </div>
                      </div>
                    ))}
                    {reportData.topByFrequency?.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Sem dados no período</p>
                    )}
                  </div>
                </div>

                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-green-500" />
                    Clientes que Mais Gastaram
                  </h3>
                  <div className="space-y-3">
                    {reportData.topBySpending?.slice(0, 8).map((c: any, i: number) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                          ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.totalAppointments} atendimentos</p>
                        </div>
                        <p className="text-sm font-bold text-green-600 flex-shrink-0">{formatCurrency(c.totalSpent)}</p>
                      </div>
                    ))}
                    {reportData.topBySpending?.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Sem dados no período</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Serviços Mais Realizados</h3>
                  {reportData.mostPerformed?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={reportData.mostPerformed.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Qtd" radius={[0, 4, 4, 0]}>
                          {reportData.mostPerformed?.slice(0, 8).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-8">Sem dados no período</p>
                  )}
                </div>

                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Serviços Mais Lucrativos</h3>
                  <div className="space-y-3">
                    {reportData.mostProfitable?.slice(0, 8).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                          ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-gray-300'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.count}x realizados</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(s.total)}</p>
                          <p className="text-xs text-gray-400">méd: {formatCurrency(s.average)}</p>
                        </div>
                      </div>
                    ))}
                    {reportData.mostProfitable?.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Sem dados no período</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
