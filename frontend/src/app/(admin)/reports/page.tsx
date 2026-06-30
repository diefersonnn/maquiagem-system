'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BarChart3, TrendingUp, Users, Scissors, Download, Filter,
  Trophy, DollarSign, Calendar
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

const COLORS = ['#d946ef', '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6']

type Period = 'month' | 'year' | 'custom'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'clients' | 'services'>('financial')
  const [period, setPeriod] = useState<Period>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const queryParams = {
    period,
    ...(period === 'custom' && customStart && customEnd ? { start: customStart, end: customEnd } : {}),
  }

  const { data: financial, isLoading: financialLoading } = useQuery({
    queryKey: ['report-financial', period, customStart, customEnd],
    queryFn: async () => (await api.get('/reports/financial', { params: queryParams })).data,
    enabled: activeTab === 'financial',
  })

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['report-clients', period, customStart, customEnd],
    queryFn: async () => (await api.get('/reports/clients', { params: queryParams })).data,
    enabled: activeTab === 'clients',
  })

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['report-services', period, customStart, customEnd],
    queryFn: async () => (await api.get('/reports/services', { params: queryParams })).data,
    enabled: activeTab === 'services',
  })

  const isLoading = financialLoading || clientsLoading || servicesLoading

  const handleExportExcel = () => {
    const type = activeTab === 'financial' ? 'financial' : 'clients'
    const params = new URLSearchParams({ type, period })
    if (period === 'custom' && customStart && customEnd) {
      params.set('start', customStart)
      params.set('end', customEnd)
    }
    const token = localStorage.getItem('token')
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reports/export/excel?${params}`
    const a = document.createElement('a')
    a.href = url
    a.click()
  }

  const PERIOD_LABELS: Record<Period, string> = { month: 'Este Mês', year: 'Este Ano', custom: 'Personalizado' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-primary-500" />
          Relatórios
        </h1>
        <button onClick={handleExportExcel} className="btn-secondary">
          <Download size={16} />
          Exportar Excel
        </button>
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
      ) : (
        <>
          {/* Financial Tab */}
          {activeTab === 'financial' && financial && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5">
                  <p className="text-sm text-gray-500">Total Faturado</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(financial.totalIncome)}</p>
                </div>
                <div className="card p-5">
                  <p className="text-sm text-gray-500">Total Gasto</p>
                  <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(financial.totalExpenses)}</p>
                </div>
                <div className="card p-5">
                  <p className="text-sm text-gray-500">Lucro Líquido</p>
                  <p className={`text-2xl font-bold mt-1 ${financial.netProfit >= 0 ? 'text-primary-600' : 'text-red-500'}`}>
                    {formatCurrency(financial.netProfit)}
                  </p>
                </div>
              </div>

              {/* Payment Methods Chart */}
              {financial.byPaymentMethod?.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Receitas por Forma de Pagamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={financial.byPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                          {financial.byPaymentMethod.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {financial.byPaymentMethod.map((pm: any, i: number) => (
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
          {activeTab === 'clients' && clients && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top by frequency */}
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" />
                    Clientes que Mais Retornam
                  </h3>
                  <div className="space-y-3">
                    {clients.topByFrequency?.slice(0, 8).map((c: any, i: number) => (
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
                    {clients.topByFrequency?.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Sem dados no período</p>
                    )}
                  </div>
                </div>

                {/* Top by spending */}
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign size={16} className="text-green-500" />
                    Clientes que Mais Gastaram
                  </h3>
                  <div className="space-y-3">
                    {clients.topBySpending?.slice(0, 8).map((c: any, i: number) => (
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
                    {clients.topBySpending?.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Sem dados no período</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && services && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Serviços Mais Realizados</h3>
                  {services.mostPerformed?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={services.mostPerformed.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Qtd" radius={[0, 4, 4, 0]}>
                          {services.mostPerformed?.slice(0, 8).map((_: any, i: number) => (
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
                    {services.mostProfitable?.slice(0, 8).map((s: any, i: number) => (
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
                    {services.mostProfitable?.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">Sem dados no período</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
