'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Financial, FinancialSummary } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, X, Trash2,
  ArrowUpCircle, ArrowDownCircle, Filter, PieChart
} from 'lucide-react'
import { useToast } from '@/app/providers'
import {
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip
} from 'recharts'

const EXPENSE_CATEGORIES = ['Material', 'Despesas fixas', 'Transporte', 'Marketing', 'Outros']
const COLORS = ['#d946ef', '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom'

function IncomeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Atendimento',
  })
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/financial/income', form)
      addToast('success', 'Receita registrada!')
      onSuccess()
      onClose()
    } catch {
      addToast('error', 'Erro ao registrar receita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Nova Receita</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Descrição *</label>
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="Ex: Maquiagem festa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$) *</label>
              <input type="number" step="0.01" className="input" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required placeholder="0,00" />
            </div>
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Outros',
  })
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/financial/expense', form)
      addToast('success', 'Despesa registrada!')
      onSuccess()
      onClose()
    } catch {
      addToast('error', 'Erro ao registrar despesa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Nova Despesa</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Descrição *</label>
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="Ex: Energia elétrica" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$) *</label>
              <input type="number" step="0.01" className="input" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required placeholder="0,00" />
            </div>
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FinancialPage() {
  const [period, setPeriod] = useState<PeriodFilter>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all')
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const params: any = { period }
  if (period === 'custom' && customStart && customEnd) {
    params.start = customStart
    params.end = customEnd
  }
  if (activeTab !== 'all') params.type = activeTab.toUpperCase()

  const { data, isLoading } = useQuery<FinancialSummary>({
    queryKey: ['financial', period, customStart, customEnd, activeTab],
    queryFn: async () => (await api.get('/financial', { params })).data,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/financial/${id}`),
    onSuccess: () => {
      addToast('success', 'Entrada removida')
      queryClient.invalidateQueries({ queryKey: ['financial'] })
    },
    onError: () => addToast('error', 'Erro ao remover'),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['financial'] })

  const items = data?.items || []
  const summary = data?.summary || { totalIncome: 0, totalExpenses: 0, netProfit: 0 }

  const PERIOD_LABELS: Record<PeriodFilter, string> = {
    today: 'Hoje',
    week: 'Semana',
    month: 'Mês',
    year: 'Ano',
    custom: 'Personalizado',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign size={24} className="text-primary-500" />
          Financeiro
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowIncomeModal(true)} className="btn-primary text-sm">
            <ArrowUpCircle size={15} />
            Receita
          </button>
          <button onClick={() => setShowExpenseModal(true)} className="btn-secondary text-sm">
            <ArrowDownCircle size={15} />
            Despesa
          </button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(['today', 'week', 'month', 'year', 'custom'] as PeriodFilter[]).map(p => (
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <TrendingUp size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Receitas</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <TrendingDown size={22} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Despesas</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalExpenses)}</p>
          </div>
        </div>
        <div className={`card p-5 flex items-center gap-4 ${summary.netProfit >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${summary.netProfit >= 0 ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-red-100'}`}>
            <DollarSign size={22} className={summary.netProfit >= 0 ? 'text-primary-600' : 'text-red-500'} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Lucro Líquido</p>
            <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-primary-600' : 'text-red-500'}`}>
              {formatCurrency(summary.netProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {([['all', 'Todos'], ['income', 'Receitas'], ['expense', 'Despesas']] as [typeof activeTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors
                ${activeTab === tab
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <DollarSign size={36} className="text-gray-300" />
            <p className="text-gray-400 text-sm">Nenhuma entrada no período</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${item.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}
                >
                  {item.type === 'INCOME'
                    ? <ArrowUpCircle size={16} className="text-green-600" />
                    : <ArrowDownCircle size={16} className="text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-gray-400">{formatDate(item.date)}</p>
                    {item.category && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                    {item.paymentMethod && (
                      <span className="text-xs text-gray-400">{item.paymentMethod.name}</span>
                    )}
                    {item.client && (
                      <span className="text-xs text-gray-400">
                        {item.client.firstName} {item.client.lastName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className={`text-base font-bold ${item.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                    {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.value)}
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Remover esta entrada?')) deleteMutation.mutate(item.id)
                    }}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showIncomeModal && <IncomeModal onClose={() => setShowIncomeModal(false)} onSuccess={refresh} />}
      {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} onSuccess={refresh} />}
    </div>
  )
}
