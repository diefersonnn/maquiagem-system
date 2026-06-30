'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { getClients, createClient, updateClient, deleteClient } from '@/lib/firestore'
import { Client } from '@/types'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import { Plus, Search, Users, Phone, Calendar, DollarSign, ChevronRight, Edit2, Trash2, X } from 'lucide-react'
import { useToast } from '@/app/providers'

function ClientFormModal({
  client,
  onClose,
  onSuccess,
}: {
  client?: Client | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    firstName: client?.firstName || '',
    lastName: client?.lastName || '',
    phone: client?.phone || '',
  })
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (client) {
        await updateClient(client.id, form)
        addToast('success', 'Cliente atualizado!')
      } else {
        await createClient(form)
        addToast('success', 'Cliente cadastrado!')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      addToast('error', err.message || 'Erro ao salvar cliente')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (v: string) => {
    const digits = v.replace(/\D/g, '')
    let formatted = digits
    if (digits.length <= 10) {
      formatted = digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    } else {
      formatted = digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    }
    setForm(f => ({ ...f, phone: formatted.slice(0, 15) }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome *</label>
              <input
                className="input"
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                required
                placeholder="Ana"
              />
            </div>
            <div>
              <label className="label">Sobrenome *</label>
              <input
                className="input"
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                required
                placeholder="Silva"
              />
            </div>
          </div>
          <div>
            <label className="label">Celular *</label>
            <input
              className="input"
              value={form.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              required
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Salvando...' : client ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const router = useRouter()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', search],
    queryFn: () => getClients(search || undefined) as Promise<Client[]>,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      addToast('success', 'Cliente removido')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: () => addToast('error', 'Erro ao remover cliente'),
  })

  const handleDelete = (client: Client) => {
    if (confirm(`Remover ${client.firstName} ${client.lastName}? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(client.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={24} className="text-primary-500" />
            Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} clientes cadastrados</p>
        </div>
        <button onClick={() => { setEditClient(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={40} className="text-gray-300" />
            <p className="text-gray-500">Nenhum cliente encontrado</p>
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Telefone</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Atendimentos</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Gasto</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Último Atend.</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {clients.map(client => (
                    <tr
                      key={client.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-rose-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {client.firstName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {client.firstName} {client.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                          <Phone size={13} className="text-gray-400" />
                          {client.phone}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400">
                          {client.totalAppointments || 0} atend.
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(client.totalSpent || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {client.lastAppointment ? formatDate(client.lastAppointment) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => { setEditClient(client); setShowModal(true) }}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                          <ChevronRight size={15} className="text-gray-300" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {clients.map(client => (
                <div
                  key={client.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-rose-400 flex items-center justify-center text-white font-bold">
                        {client.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{client.firstName} {client.lastName}</p>
                        <p className="text-sm text-gray-400">{client.phone}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                  <div className="flex gap-4 mt-3 pl-13">
                    <span className="text-xs text-gray-400">{client.totalAppointments || 0} atendimentos</span>
                    <span className="text-xs font-semibold text-primary-600">{formatCurrency(client.totalSpent || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <ClientFormModal
          client={editClient}
          onClose={() => { setShowModal(false); setEditClient(null) }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
        />
      )}
    </div>
  )
}
