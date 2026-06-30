'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Appointment, Client, Service, PaymentMethod, AppointmentStatus, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatCurrency, formatDate, formatTime, formatDateTime } from '@/lib/utils'
import {
  Calendar, Plus, X, ChevronLeft, ChevronRight, Clock,
  Check, Ban, AlertCircle, Edit2, Trash2, UserPlus, AlertTriangle
} from 'lucide-react'
import { useToast } from '@/app/providers'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  addWeeks, subWeeks, startOfWeek, endOfWeek
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ViewMode = 'month' | 'week' | 'day'

// ─── Mini formulário de novo cliente ─────────────────────────────────────────
function InlineClientForm({
  onCreated,
  onCancel,
}: {
  onCreated: (client: Client) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()

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

  // Buscar cliente existente pelo celular enquanto digita
  const handlePhoneBlur = async () => {
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length < 10) return
    try {
      const { data } = await api.get('/clients', { params: { search: form.phone } })
      const found = data.find((c: Client) => c.phone.replace(/\D/g, '') === digits)
      if (found) {
        setError(`Já existe um cliente com este celular: ${found.firstName} ${found.lastName}`)
      } else {
        setError('')
      }
    } catch { /* ignore */ }
  }

  const handleSubmit = async () => {
    if (error || !form.firstName || !form.lastName || !form.phone) return
    setLoading(true)
    try {
      const { data } = await api.post('/clients', form)
      addToast('success', `Cliente ${data.firstName} cadastrado!`)
      onCreated(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl space-y-3">
      <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 flex items-center gap-1">
        <UserPlus size={13} />
        Novo Cliente
      </p>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input text-sm py-1.5"
            placeholder="Nome *"
            value={form.firstName}
            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
          />
          <input
            className="input text-sm py-1.5"
            placeholder="Sobrenome *"
            value={form.lastName}
            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
          />
        </div>
        <input
          className={`input text-sm py-1.5 ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
          placeholder="Celular * (11) 99999-9999"
          value={form.phone}
          onChange={e => handlePhoneChange(e.target.value)}
          onBlur={handlePhoneBlur}
        />
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={11} /> {error}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1 px-3 flex-1">
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading || !!error || !form.firstName || !form.lastName || !form.phone}
            onClick={handleSubmit}
            className="btn-primary text-xs py-1 px-3 flex-1"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Alerta de conflito ───────────────────────────────────────────────────────
function ConflictAlert({
  conflict,
  intervalMinutes,
  onForce,
  onCancel,
}: {
  conflict: Appointment
  intervalMinutes: number
  onForce: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Conflito de Horário</h3>
            <p className="text-sm text-gray-500 mt-1">
              Já existe um agendamento dentro do intervalo mínimo de <strong>{intervalMinutes} min</strong>:
            </p>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
            {formatDateTime(conflict.date)}
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-400 mt-0.5">
            {conflict.client?.firstName} {conflict.client?.lastName} — {conflict.service?.name}
          </p>
          <span className={`badge text-xs mt-1 ${STATUS_COLORS[conflict.status]}`}>
            {STATUS_LABELS[conflict.status]}
          </span>
        </div>

        <p className="text-sm text-gray-500">
          Deseja agendar mesmo assim?
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={onForce} className="btn-primary flex-1 bg-orange-500 hover:bg-orange-600">
            Agendar mesmo assim
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal de Agendamento ─────────────────────────────────────────────────────
function AppointmentModal({
  appointment,
  selectedDate,
  onClose,
  onSuccess,
}: {
  appointment?: Appointment | null
  selectedDate?: Date
  onClose: () => void
  onSuccess: () => void
}) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [conflict, setConflict] = useState<{ appointment: Appointment; intervalMinutes: number } | null>(null)

  const { data: clients = [], refetch: refetchClients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
  })

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => (await api.get('/services')).data,
  })

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => (await api.get('/payment-methods')).data,
  })

  const defaultDate = selectedDate || new Date()
  const [form, setForm] = useState({
    clientId: appointment?.clientId || '',
    serviceId: appointment?.serviceId || '',
    paymentMethodId: appointment?.paymentMethodId || '',
    date: appointment ? format(new Date(appointment.date), 'yyyy-MM-dd') : format(defaultDate, 'yyyy-MM-dd'),
    time: appointment ? format(new Date(appointment.date), 'HH:mm') : '09:00',
    value: appointment?.value?.toString() || '',
    notes: appointment?.notes || '',
    status: appointment?.status || 'SCHEDULED',
  })

  const selectedService = services.find(s => s.id === form.serviceId)
  useEffect(() => {
    if (selectedService && !appointment) {
      setForm(f => ({ ...f, value: selectedService.price.toString() }))
    }
  }, [form.serviceId, selectedService, appointment])

  const doSave = async (force = false) => {
    setLoading(true)
    try {
      const dateTime = new Date(`${form.date}T${form.time}:00`)
      const payload = {
        clientId: form.clientId,
        serviceId: form.serviceId,
        paymentMethodId: form.paymentMethodId || null,
        date: dateTime.toISOString(),
        value: parseFloat(form.value),
        notes: form.notes || null,
        status: form.status,
        force,
      }

      // validateStatus: tratar 409 como resposta válida (evita erro no console do navegador)
      const opts = { validateStatus: (s: number) => s < 500 }

      const res = appointment
        ? await api.put(`/appointments/${appointment.id}`, payload, opts)
        : await api.post('/appointments', payload, opts)

      if (res.status === 409 && res.data?.code === 'SCHEDULE_CONFLICT') {
        setConflict({
          appointment: res.data.conflictingAppointment,
          intervalMinutes: res.data.intervalMinutes,
        })
        return
      }

      addToast('success', appointment ? 'Agendamento atualizado!' : 'Agendamento criado!')
      onSuccess()
      onClose()
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientId || !form.serviceId) {
      addToast('error', 'Selecione o cliente e o serviço')
      return
    }
    await doSave(false)
  }

  const handleClientCreated = (client: Client) => {
    refetchClients()
    setForm(f => ({ ...f, clientId: client.id }))
    setShowNewClient(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Cliente */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Cliente *</label>
                {!showNewClient && (
                  <button
                    type="button"
                    onClick={() => setShowNewClient(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
                  >
                    <UserPlus size={12} />
                    Cadastrar novo
                  </button>
                )}
              </div>
              <select
                className="select"
                value={form.clientId}
                onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                required
              >
                <option value="">Selecione o cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} — {c.phone}
                  </option>
                ))}
              </select>
              {showNewClient && (
                <InlineClientForm
                  onCreated={handleClientCreated}
                  onCancel={() => setShowNewClient(false)}
                />
              )}
            </div>

            {/* Serviço */}
            <div>
              <label className="label">Serviço *</label>
              <select
                className="select"
                value={form.serviceId}
                onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                required
              >
                <option value="">Selecione o serviço...</option>
                {services.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Data + Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data *</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Horário *</label>
                <input
                  type="time"
                  className="input"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Valor + Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="label">Pagamento</label>
                <select
                  className="select"
                  value={form.paymentMethodId}
                  onChange={e => setForm(f => ({ ...f, paymentMethodId: e.target.value }))}
                >
                  <option value="">A definir</option>
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status (apenas edição) */}
            {appointment && (
              <div>
                <label className="label">Status</label>
                <select
                  className="select"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as AppointmentStatus }))}
                >
                  {Object.entries(STATUS_LABELS)
                    .filter(([value]) => !['CONFIRMED', 'COMPLETED'].includes(value))
                    .map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                </select>
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="label">Observações</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Alguma observação especial..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Salvando...' : appointment ? 'Atualizar' : 'Agendar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de conflito */}
      {conflict && (
        <ConflictAlert
          conflict={conflict.appointment}
          intervalMinutes={conflict.intervalMinutes}
          onForce={() => { setConflict(null); doSave(true) }}
          onCancel={() => setConflict(null)}
        />
      )}
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null)
  const [showDetail, setShowDetail] = useState<Appointment | null>(null)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const getDateRange = () => {
    if (viewMode === 'month') {
      return {
        start: startOfMonth(currentDate).toISOString(),
        end: endOfMonth(currentDate).toISOString(),
      }
    }
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { locale: ptBR }).toISOString(),
        end: endOfWeek(currentDate, { locale: ptBR }).toISOString(),
      }
    }
    const d = new Date(currentDate); d.setHours(0, 0, 0, 0)
    const e = new Date(currentDate); e.setHours(23, 59, 59)
    return { start: d.toISOString(), end: e.toISOString() }
  }

  const range = getDateRange()

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', range.start, range.end],
    queryFn: async () => (await api.get('/appointments', { params: { start: range.start, end: range.end } })).data,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => {
      addToast('success', 'Status atualizado!')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowDetail(null)
    },
    onError: () => addToast('error', 'Erro ao atualizar status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/appointments/${id}`),
    onSuccess: () => {
      addToast('success', 'Agendamento removido')
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      setShowDetail(null)
    },
    onError: () => addToast('error', 'Erro ao remover'),
  })

  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'month') setCurrentDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
    else if (viewMode === 'week') setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    else setCurrentDate(d => { const n = new Date(d); n.setDate(d.getDate() + dir); return n })
  }

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter(apt => isSameDay(new Date(apt.date), day))

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { locale: ptBR }),
    end: endOfWeek(endOfMonth(currentDate), { locale: ptBR }),
  })

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { locale: ptBR }),
    end: endOfWeek(currentDate, { locale: ptBR }),
  })

  const statusActionButtons = [
    { status: 'CANCELLED', label: 'Cancelar', color: 'bg-red-50 text-red-700 hover:bg-red-100', icon: Ban },
    { status: 'NO_SHOW', label: 'Não Compareceu', color: 'bg-gray-50 text-gray-700 hover:bg-gray-100', icon: AlertCircle },
  ]

  const aptStatusClass = (status: AppointmentStatus) => {
    if (status === 'COMPLETED') return 'bg-purple-100 text-purple-700'
    if (status === 'CONFIRMED') return 'bg-green-100 text-green-700'
    if (status === 'SCHEDULED') return 'bg-blue-100 text-blue-700'
    if (status === 'CANCELLED') return 'bg-red-100 text-red-600 line-through opacity-60'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar size={24} className="text-primary-500" />
          Agenda
        </h1>
        <button
          onClick={() => { setEditAppointment(null); setSelectedDate(selectedDate || new Date()); setShowModal(true) }}
          className="btn-primary"
        >
          <Plus size={16} />
          Novo Agendamento
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
              }`}
            >
              {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ChevronLeft size={16} /></button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white min-w-[160px] text-center capitalize">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            {viewMode === 'week' && `${format(weekDays[0], 'dd/MM')} - ${format(weekDays[6], 'dd/MM/yyyy')}`}
            {viewMode === 'day' && format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <button onClick={() => navigate(1)} className="btn-secondary p-2"><ChevronRight size={16} /></button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-sm px-3 py-1.5">Hoje</button>
        </div>
      </div>

      {/* Calendar Views */}
      {isLoading ? (
        <div className="card flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Month */}
          {viewMode === 'month' && (
            <div className="card overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((day, idx) => {
                  const dayApts = getAppointmentsForDay(day)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const selected = selectedDate && isSameDay(day, selectedDate)
                  return (
                    <div
                      key={idx}
                      onClick={() => { setSelectedDate(day); if (dayApts.length === 0) { setShowModal(true) } }}
                      className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 dark:border-gray-800 cursor-pointer transition-colors
                        ${isCurrentMonth ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-900/50'}
                        ${selected ? 'ring-2 ring-inset ring-primary-400' : ''}
                      `}
                    >
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 font-medium
                        ${isToday(day) ? 'bg-primary-600 text-white' : isCurrentMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}
                      `}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {dayApts.slice(0, 2).map(apt => (
                          <div
                            key={apt.id}
                            onClick={e => { e.stopPropagation(); setShowDetail(apt) }}
                            className={`text-xs rounded px-1 py-0.5 truncate cursor-pointer font-medium ${aptStatusClass(apt.status)}`}
                          >
                            {formatTime(apt.date)} {apt.client?.firstName}
                          </div>
                        ))}
                        {dayApts.length > 2 && (
                          <div className="text-xs text-gray-400 pl-1">+{dayApts.length - 2} mais</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Week */}
          {viewMode === 'week' && (
            <div className="card overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={`py-3 px-2 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50
                      ${isToday(day) ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                    `}
                    onClick={() => { setSelectedDate(day); setShowModal(true) }}
                  >
                    <p className="text-xs text-gray-400 capitalize">{format(day, 'EEE', { locale: ptBR })}</p>
                    <p className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                      {format(day, 'd')}
                    </p>
                    <div className="mt-2 space-y-1">
                      {getAppointmentsForDay(day).map(apt => (
                        <div
                          key={apt.id}
                          onClick={e => { e.stopPropagation(); setShowDetail(apt) }}
                          className={`text-xs rounded px-1 py-1 text-left cursor-pointer ${STATUS_COLORS[apt.status]}`}
                        >
                          <p className="font-medium">{formatTime(apt.date)}</p>
                          <p className="truncate">{apt.client?.firstName}</p>
                          <p className="truncate text-gray-400">{apt.service?.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day */}
          {viewMode === 'day' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                  {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
                <span className="badge bg-primary-50 text-primary-700">
                  {getAppointmentsForDay(currentDate).length} agendamentos
                </span>
              </div>
              {getAppointmentsForDay(currentDate).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Calendar size={36} className="text-gray-300" />
                  <p className="text-gray-400">Nenhum agendamento neste dia</p>
                  <button onClick={() => { setSelectedDate(currentDate); setShowModal(true) }} className="btn-primary text-sm">
                    Criar Agendamento
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getAppointmentsForDay(currentDate)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(apt => (
                      <div
                        key={apt.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
                        onClick={() => setShowDetail(apt)}
                      >
                        <div className="text-center min-w-[56px]">
                          <p className="text-lg font-bold text-primary-600">{formatTime(apt.date)}</p>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {apt.client?.firstName} {apt.client?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{apt.service?.name}</p>
                          {apt.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{apt.notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(apt.value)}</p>
                          <span className={`badge text-xs ${STATUS_COLORS[apt.status]}`}>
                            {STATUS_LABELS[apt.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">Detalhes do Agendamento</h3>
              <button onClick={() => setShowDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-rose-400 flex items-center justify-center text-white font-bold">
                  {showDetail.client?.firstName?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {showDetail.client?.firstName} {showDetail.client?.lastName}
                  </p>
                  <p className="text-sm text-gray-400">{showDetail.client?.phone}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Serviço</span>
                  <span className="font-medium text-gray-900 dark:text-white">{showDetail.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Data/Hora</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDateTime(showDetail.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Valor</span>
                  <span className="font-bold text-primary-600">{formatCurrency(showDetail.value)}</span>
                </div>
                {showDetail.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pagamento</span>
                    <span className="font-medium text-gray-900 dark:text-white">{showDetail.paymentMethod.name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  <span className={`badge text-xs ${STATUS_COLORS[showDetail.status]}`}>
                    {STATUS_LABELS[showDetail.status]}
                  </span>
                </div>
                {showDetail.notes && (
                  <div className="pt-1">
                    <span className="text-gray-400 block">Obs:</span>
                    <p className="text-gray-600 dark:text-gray-300 italic">{showDetail.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">Ações Rápidas</p>
                <div className="grid grid-cols-2 gap-2">
                  {statusActionButtons
                    .filter(b => b.status !== showDetail.status)
                    .map(b => (
                      <button
                        key={b.status}
                        onClick={() => updateStatusMutation.mutate({ id: showDetail.id, status: b.status })}
                        className={`text-xs px-3 py-2 rounded-lg font-medium flex items-center gap-1 justify-center ${b.color}`}
                      >
                        <b.icon size={13} />
                        {b.label}
                      </button>
                    ))
                  }
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setEditAppointment(showDetail); setShowDetail(null); setShowModal(true) }}
                  className="btn-secondary flex-1 text-sm py-2"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => { if (confirm('Remover este agendamento?')) deleteMutation.mutate(showDetail.id) }}
                  className="btn-danger flex-1 text-sm py-2"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <AppointmentModal
          appointment={editAppointment}
          selectedDate={selectedDate || undefined}
          onClose={() => { setShowModal(false); setEditAppointment(null) }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          }}
        />
      )}
    </div>
  )
}
