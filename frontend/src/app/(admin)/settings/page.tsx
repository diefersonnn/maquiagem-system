'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Service, PaymentMethod } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Settings, Scissors, CreditCard, Shield, Plus, X, Edit2, Trash2,
  Save, Download, Upload, Trash, RefreshCw, Sun, Moon, User, Calendar, Clock
} from 'lucide-react'
import { useToast } from '@/app/providers'
import { useTheme } from '@/app/providers'
import { useAuth } from '@/hooks/useAuth'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'services' | 'payments' | 'agenda' | 'backup' | 'profile'>('services')
  const { addToast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => (await api.get('/services')).data,
  })

  const [editService, setEditService] = useState<Service | null>(null)
  const [newService, setNewService] = useState({ name: '', price: '' })
  const [showServiceForm, setShowServiceForm] = useState(false)

  const saveServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editService) {
        return api.put(`/services/${editService.id}`, data)
      }
      return api.post('/services', data)
    },
    onSuccess: () => {
      addToast('success', editService ? 'Serviço atualizado!' : 'Serviço criado!')
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setShowServiceForm(false)
      setEditService(null)
      setNewService({ name: '', price: '' })
    },
    onError: () => addToast('error', 'Erro ao salvar serviço'),
  })

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => {
      addToast('success', 'Serviço desativado')
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
  })

  // Payment Methods
  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods-all'],
    queryFn: async () => (await api.get('/payment-methods')).data,
  })

  const [newPayment, setNewPayment] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const savePaymentMutation = useMutation({
    mutationFn: (name: string) => api.post('/payment-methods', { name }),
    onSuccess: () => {
      addToast('success', 'Forma de pagamento adicionada!')
      queryClient.invalidateQueries({ queryKey: ['payment-methods-all'] })
      setShowPaymentForm(false)
      setNewPayment('')
    },
    onError: () => addToast('error', 'Erro ao salvar'),
  })

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payment-methods/${id}`),
    onSuccess: () => {
      addToast('success', 'Forma de pagamento removida')
      queryClient.invalidateQueries({ queryKey: ['payment-methods-all'] })
    },
  })

  // Backup
  const { data: backups = [], refetch: refetchBackups } = useQuery<any[]>({
    queryKey: ['backups'],
    queryFn: async () => (await api.get('/backup/list')).data,
    enabled: activeTab === 'backup',
  })

  const createBackupMutation = useMutation({
    mutationFn: () => api.post('/backup/create'),
    onSuccess: () => {
      addToast('success', 'Backup criado com sucesso!')
      refetchBackups()
    },
    onError: () => addToast('error', 'Erro ao criar backup'),
  })

  const deleteBackupMutation = useMutation({
    mutationFn: (filename: string) => api.delete(`/backup/${filename}`),
    onSuccess: () => {
      addToast('success', 'Backup removido')
      refetchBackups()
    },
  })

  const restoreBackupMutation = useMutation({
    mutationFn: (filename: string) => api.post(`/backup/restore/${filename}`),
    onSuccess: () => {
      addToast('success', 'Backup restaurado com sucesso!')
      queryClient.invalidateQueries()
    },
    onError: () => addToast('error', 'Erro ao restaurar backup'),
  })

  const downloadBackup = (filename: string) => {
    const token = localStorage.getItem('token')
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/backup/download/${filename}`
    const a = document.createElement('a')
    a.href = url
    a.click()
  }

  // Profile
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/profile', data),
    onSuccess: () => addToast('success', 'Perfil atualizado!'),
    onError: (err: any) => addToast('error', err.response?.data?.error || 'Erro ao atualizar'),
  })

  // System Settings (Agenda)
  const { data: systemSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => (await api.get('/settings')).data as Record<string, { value: string; label: string | null }>,
    enabled: activeTab === 'agenda',
  })

  const [intervalMinutes, setIntervalMinutes] = useState(45)

  useEffect(() => {
    if (systemSettings?.appointment_interval_minutes) {
      setIntervalMinutes(parseInt(systemSettings.appointment_interval_minutes.value, 10))
    }
  }, [systemSettings])

  const saveIntervalMutation = useMutation({
    mutationFn: (value: number) => api.put('/settings/appointment_interval_minutes', { value: String(value) }),
    onSuccess: () => {
      addToast('success', 'Intervalo atualizado!')
      refetchSettings()
    },
    onError: () => addToast('error', 'Erro ao salvar configuração'),
  })

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Settings size={24} className="text-primary-500" />
        Configurações
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['services', Scissors, 'Serviços'],
          ['payments', CreditCard, 'Pagamentos'],
          ['agenda', Calendar, 'Agenda'],
          ['backup', Shield, 'Backup'],
          ['profile', User, 'Perfil'],
        ] as [typeof activeTab, any, string][]).map(([tab, Icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 border border-gray-200 dark:border-gray-700'
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Services */}
      {activeTab === 'services' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Serviços Cadastrados</h2>
            <button onClick={() => { setEditService(null); setNewService({ name: '', price: '' }); setShowServiceForm(true) }} className="btn-primary text-sm">
              <Plus size={14} />
              Novo Serviço
            </button>
          </div>

          {showServiceForm && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome</label>
                  <input
                    className="input"
                    value={editService ? editService.name : newService.name}
                    onChange={e => editService
                      ? setEditService(s => s ? { ...s, name: e.target.value } : null)
                      : setNewService(f => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Nome do serviço"
                  />
                </div>
                <div>
                  <label className="label">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editService ? editService.price : newService.price}
                    onChange={e => editService
                      ? setEditService(s => s ? { ...s, price: parseFloat(e.target.value) } : null)
                      : setNewService(f => ({ ...f, price: e.target.value }))
                    }
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowServiceForm(false); setEditService(null) }} className="btn-secondary text-sm">Cancelar</button>
                <button
                  onClick={() => saveServiceMutation.mutate(
                    editService ? { name: editService.name, price: editService.price } : { name: newService.name, price: parseFloat(newService.price) }
                  )}
                  className="btn-primary text-sm"
                >
                  <Save size={14} />
                  Salvar
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {services.map(service => (
              <div key={service.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/50 flex items-center justify-center">
                    <Scissors size={14} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</p>
                    {!service.active && <span className="text-xs text-red-400">Inativo</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(service.price)}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditService(service); setShowServiceForm(true) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Desativar serviço?')) deleteServiceMutation.mutate(service.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods */}
      {activeTab === 'payments' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Formas de Pagamento</h2>
            <button onClick={() => setShowPaymentForm(true)} className="btn-primary text-sm">
              <Plus size={14} />
              Adicionar
            </button>
          </div>

          {showPaymentForm && (
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={newPayment}
                onChange={e => setNewPayment(e.target.value)}
                placeholder="Nome da forma de pagamento"
              />
              <button onClick={() => { setShowPaymentForm(false); setNewPayment('') }} className="btn-secondary">Cancelar</button>
              <button onClick={() => savePaymentMutation.mutate(newPayment)} className="btn-primary">Salvar</button>
            </div>
          )}

          <div className="space-y-2">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-primary-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{pm.name}</span>
                </div>
                <button
                  onClick={() => { if (confirm('Remover esta forma de pagamento?')) deletePaymentMutation.mutate(pm.id) }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda settings */}
      {activeTab === 'agenda' && (
        <div className="card p-5 space-y-6">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Configurações de Agenda</h2>
            <p className="text-sm text-gray-400 mt-1">
              Defina as regras para criação de agendamentos.
            </p>
          </div>

          <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Intervalo mínimo entre atendimentos
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Se dois agendamentos ficarem dentro deste intervalo, o sistema alertará sobre conflito.
                  Configure como <strong>0</strong> para desativar a verificação.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 pl-12">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={480}
                  step={5}
                  className="input w-24 text-center text-lg font-bold"
                  value={intervalMinutes}
                  onChange={e => setIntervalMinutes(parseInt(e.target.value) || 0)}
                />
                <span className="text-sm text-gray-500 font-medium">minutos</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[0, 30, 45, 60, 90].map(v => (
                  <button
                    key={v}
                    onClick={() => setIntervalMinutes(v)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                      ${intervalMinutes === v
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                  >
                    {v === 0 ? 'Livre' : `${v}min`}
                  </button>
                ))}
              </div>
            </div>

            <div className="pl-12">
              <button
                onClick={() => saveIntervalMutation.mutate(intervalMinutes)}
                disabled={saveIntervalMutation.isPending}
                className="btn-primary text-sm"
              >
                <Save size={14} />
                {saveIntervalMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>

            {systemSettings?.appointment_interval_minutes && (
              <p className="pl-12 text-xs text-gray-400">
                Configuração atual: <strong>{systemSettings.appointment_interval_minutes.value} minutos</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Backup */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Backup do Sistema</h2>
                <p className="text-sm text-gray-400 mt-0.5">Backup automático todo dia às 2h da manhã</p>
              </div>
              <button
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
                className="btn-primary"
              >
                {createBackupMutation.isPending
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <Download size={15} />
                }
                Criar Backup Agora
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Shield size={36} className="text-gray-300" />
                <p className="text-gray-400 text-sm">Nenhum backup encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {backups.map((backup: any) => (
                  <div key={backup.filename} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{backup.filename}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(backup.createdAt)} • {formatBytes(backup.size)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadBackup(backup.filename)}
                        className="btn-secondary text-sm py-1.5 px-3"
                        title="Baixar"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Restaurar este backup? Todos os dados atuais serão substituídos.')) {
                            restoreBackupMutation.mutate(backup.filename)
                          }
                        }}
                        disabled={restoreBackupMutation.isPending}
                        className="btn-secondary text-sm py-1.5 px-3"
                        title="Restaurar"
                      >
                        <Upload size={13} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Remover este backup?')) deleteBackupMutation.mutate(backup.filename) }}
                        className="btn-danger text-sm py-1.5 px-3"
                        title="Excluir"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Meu Perfil</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nome</label>
                <input
                  className="input"
                  value={profileForm.name}
                  onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={profileForm.email}
                  onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Alterar Senha</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Senha Atual</label>
                  <input
                    type="password"
                    className="input"
                    value={profileForm.currentPassword}
                    onChange={e => setProfileForm(f => ({ ...f, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="label">Nova Senha</label>
                  <input
                    type="password"
                    className="input"
                    value={profileForm.newPassword}
                    onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => updateProfileMutation.mutate(profileForm)}
              disabled={updateProfileMutation.isPending}
              className="btn-primary"
            >
              <Save size={15} />
              Salvar Alterações
            </button>
          </div>

          {/* Theme */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Aparência</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</p>
                <p className="text-xs text-gray-400">Alterne entre modo claro e escuro</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-14 h-7 rounded-full flex items-center transition-all duration-300 px-1
                  ${theme === 'dark' ? 'bg-primary-600 justify-end' : 'bg-gray-200 justify-start'}`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                  {theme === 'dark'
                    ? <Moon size={11} className="text-primary-600" />
                    : <Sun size={11} className="text-yellow-500" />
                  }
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
