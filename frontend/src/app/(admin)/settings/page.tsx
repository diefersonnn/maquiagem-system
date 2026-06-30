'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getServices, createService, updateService, deleteService,
  getPaymentMethods, createPaymentMethod, deletePaymentMethod,
  getSettings, updateSetting,
} from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import {
  updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from 'firebase/auth'
import { Service, PaymentMethod } from '@/types'
import { formatCurrency } from '@/lib/utils'
import {
  Settings, Scissors, CreditCard, Shield, Plus, X, Edit2, Trash2,
  Save, Sun, Moon, User, Calendar, Clock, Cloud
} from 'lucide-react'
import { useToast } from '@/app/providers'
import { useTheme } from '@/app/providers'
import { useAuth } from '@/hooks/useAuth'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'services' | 'payments' | 'agenda' | 'profile'>('services')
  const { addToast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // ─── Services ──────────────────────────────────────────────────────────────
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => getServices() as Promise<Service[]>,
  })

  const [editService, setEditService] = useState<Service | null>(null)
  const [newService, setNewService] = useState({ name: '', price: '' })
  const [showServiceForm, setShowServiceForm] = useState(false)

  const saveServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editService) return updateService(editService.id, data)
      return createService(data)
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
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      addToast('success', 'Serviço desativado')
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
  })

  // ─── Payment Methods ────────────────────────────────────────────────────────
  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods-all'],
    queryFn: () => getPaymentMethods() as Promise<PaymentMethod[]>,
  })

  const [newPayment, setNewPayment] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const savePaymentMutation = useMutation({
    mutationFn: (name: string) => createPaymentMethod(name),
    onSuccess: () => {
      addToast('success', 'Forma de pagamento adicionada!')
      queryClient.invalidateQueries({ queryKey: ['payment-methods-all'] })
      setShowPaymentForm(false)
      setNewPayment('')
    },
    onError: () => addToast('error', 'Erro ao salvar'),
  })

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id),
    onSuccess: () => {
      addToast('success', 'Forma de pagamento removida')
      queryClient.invalidateQueries({ queryKey: ['payment-methods-all'] })
    },
  })

  // ─── Agenda Settings ────────────────────────────────────────────────────────
  const { data: systemSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => getSettings(),
    enabled: activeTab === 'agenda',
  })

  const [intervalMinutes, setIntervalMinutes] = useState(45)

  useEffect(() => {
    if (systemSettings?.appointment_interval_minutes) {
      setIntervalMinutes(parseInt(systemSettings.appointment_interval_minutes.value, 10))
    }
  }, [systemSettings])

  const saveIntervalMutation = useMutation({
    mutationFn: (value: number) => updateSetting('appointment_interval_minutes', String(value)),
    onSuccess: () => {
      addToast('success', 'Intervalo atualizado!')
      refetchSettings()
    },
    onError: () => addToast('error', 'Erro ao salvar configuração'),
  })

  // ─── Profile ────────────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)

  const handleSaveProfile = async () => {
    const fbUser = auth.currentUser
    if (!fbUser) return
    setProfileLoading(true)
    try {
      if (profileForm.name && profileForm.name !== fbUser.displayName) {
        await updateProfile(fbUser, { displayName: profileForm.name })
      }
      if (profileForm.newPassword) {
        if (!profileForm.currentPassword) {
          addToast('error', 'Informe a senha atual para alterá-la')
          setProfileLoading(false)
          return
        }
        const credential = EmailAuthProvider.credential(fbUser.email!, profileForm.currentPassword)
        await reauthenticateWithCredential(fbUser, credential)
        await updatePassword(fbUser, profileForm.newPassword)
      }
      addToast('success', 'Perfil atualizado!')
      setProfileForm(f => ({ ...f, currentPassword: '', newPassword: '' }))
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        addToast('error', 'Senha atual incorreta')
      } else {
        addToast('error', 'Erro ao atualizar perfil')
      }
    } finally {
      setProfileLoading(false)
    }
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
                    editService
                      ? { name: editService.name, price: editService.price }
                      : { name: newService.name, price: parseFloat(newService.price) }
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
            <p className="text-sm text-gray-400 mt-1">Defina as regras para criação de agendamentos.</p>
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
                  Configure como <strong>0</strong> para desativar.
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

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Meu Perfil</h2>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                value={auth.currentUser?.email || ''}
                readOnly
              />
              <p className="text-xs text-gray-400 mt-1">O email não pode ser alterado.</p>
            </div>
            <div>
              <label className="label">Nome de exibição</label>
              <input
                className="input"
                value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Seu nome"
              />
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
              onClick={handleSaveProfile}
              disabled={profileLoading}
              className="btn-primary"
            >
              <Save size={15} />
              {profileLoading ? 'Salvando...' : 'Salvar Alterações'}
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

          {/* Firebase info */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <Cloud size={20} className="text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Dados na Nuvem</p>
                <p className="text-xs text-gray-400">Seus dados são gerenciados pelo Firebase com backup automático e segurança em nuvem.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
