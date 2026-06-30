'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/lib/firestore'
import { InventoryItem } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, Plus, X, Trash2, Edit2, Search } from 'lucide-react'
import { useToast } from '@/app/providers'

const CATEGORIES = ['Base', 'Corretivo', 'Pó', 'Blush', 'Batom', 'Sombra', 'Cílios', 'Primer', 'Iluminador', 'Outros']

function InventoryModal({
  item,
  onClose,
  onSuccess,
}: {
  item?: InventoryItem | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    name: item?.name || '',
    value: item?.value?.toString() || '',
    purchaseDate: item?.purchaseDate ? String(item.purchaseDate).split('T')[0] : new Date().toISOString().split('T')[0],
    notes: item?.notes || '',
    category: item?.category || 'Outros',
  })
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, value: parseFloat(form.value) }
      if (item) {
        await updateInventoryItem(item.id, payload)
        addToast('success', 'Item atualizado!')
      } else {
        await createInventoryItem(payload)
        addToast('success', 'Compra registrada!')
      }
      onSuccess()
      onClose()
    } catch {
      addToast('error', 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {item ? 'Editar Item' : 'Registrar Compra'}
          </h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Nome do Produto *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Ex: Base Maybelline Fit Me"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor Pago (R$) *</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                required
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="label">Data da Compra *</label>
              <input
                type="date"
                className="input"
                value={form.purchaseDate}
                onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Categoria</label>
            <select
              className="select"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Tonalidade, marca específica..."
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Salvando...' : item ? 'Atualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data: allItems = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => getInventory() as Promise<InventoryItem[]>,
  })

  const items = allItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !categoryFilter || item.category === categoryFilter
    return matchSearch && matchCategory
  })

  const totalSpent = items.reduce((s, i) => s + (i.value || 0), 0)

  const categoryStats = CATEGORIES
    .map(cat => ({
      name: cat,
      count: items.filter(i => i.category === cat).length,
      total: items.filter(i => i.category === cat).reduce((s, i) => s + (i.value || 0), 0),
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.total - a.total)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => {
      addToast('success', 'Item removido')
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: () => addToast('error', 'Erro ao remover'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={24} className="text-primary-500" />
            Estoque / Compras
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Histórico de produtos comprados</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} />
          Registrar Compra
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Investido</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">{formatCurrency(totalSpent)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{items.length} produtos cadastrados</p>
        </div>
        {categoryStats.slice(0, 2).map(cat => (
          <div key={cat.name} className="card p-5">
            <p className="text-sm text-gray-500">{cat.name}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(cat.total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cat.count} produtos</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select w-auto"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Items Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Package size={40} className="text-gray-300" />
            <p className="text-gray-400">Nenhum produto cadastrado</p>
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">Registrar primeira compra</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Produto</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoria</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Valor Pago</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Data</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Obs.</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/50 flex items-center justify-center">
                          <Package size={14} className="text-primary-500" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {item.category || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.value)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-500">{formatDate(item.purchaseDate)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-gray-400 truncate max-w-[150px] block">{item.notes || '-'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditItem(item); setShowModal(true) }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Remover este item?')) deleteMutation.mutate(item.id)
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <InventoryModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null) }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}
        />
      )}
    </div>
  )
}
