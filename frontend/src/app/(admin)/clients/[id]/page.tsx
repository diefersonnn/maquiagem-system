'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getClient, getAppointments } from '@/lib/firestore'
import { Client, Appointment, STATUS_LABELS, STATUS_COLORS } from '@/types'
import { formatCurrency, formatDate, formatDateTime, formatTime } from '@/lib/utils'
import {
  ArrowLeft, Phone, Calendar, DollarSign,
  Clock, Repeat, ChevronRight, Star, Edit2
} from 'lucide-react'

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const [client, allApts] = await Promise.all([
        getClient(id as string),
        getAppointments(),
      ])
      if (!client) return null

      const appointments = (allApts as any[]).filter(a => a.clientId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const completedApts = appointments.filter(a => a.status === 'COMPLETED')
      const totalSpent = completedApts.reduce((s: number, a: any) => s + (a.value || 0), 0)
      const totalAppointments = completedApts.length

      const lastAppointment = completedApts.length > 0
        ? completedApts[0].date
        : null

      const nextAppointment = appointments
        .filter(a => a.status === 'SCHEDULED' && new Date(a.date) > new Date())
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date || null

      return { ...client, appointments, totalSpent, totalAppointments, lastAppointment, nextAppointment }
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return <p className="text-gray-500">Cliente não encontrado.</p>

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar para Clientes
      </button>

      {/* Client Header */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-rose-400 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {data.firstName.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.firstName} {data.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Phone size={14} className="text-gray-400" />
              <span className="text-gray-500">{data.phone}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Cliente desde {formatDate(data.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/50 mx-auto mb-2">
              <Repeat size={18} className="text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalAppointments || 0}</p>
            <p className="text-xs text-gray-400">Atendimentos</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/50 mx-auto mb-2">
              <DollarSign size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data.totalSpent || 0)}</p>
            <p className="text-xs text-gray-400">Total Gasto</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/50 mx-auto mb-2">
              <Clock size={18} className="text-blue-600" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {data.lastAppointment ? formatDate(data.lastAppointment) : '-'}
            </p>
            <p className="text-xs text-gray-400">Último Atend.</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/50 mx-auto mb-2">
              <Calendar size={18} className="text-purple-600" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {data.nextAppointment ? formatDate(data.nextAppointment) : '-'}
            </p>
            <p className="text-xs text-gray-400">Próximo Atend.</p>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Histórico de Atendimentos</h2>
          <p className="text-sm text-gray-400 mt-0.5">{data.appointments?.length || 0} registros</p>
        </div>

        {data.appointments?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Calendar size={36} className="text-gray-300" />
            <p className="text-gray-400 text-sm">Nenhum atendimento registrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {data.appointments?.map((apt: any) => (
              <div key={apt.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="text-center min-w-[60px]">
                  <p className="text-xs text-gray-400">
                    {new Date(apt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatTime(apt.date)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(apt.date).getFullYear()}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-white">{apt.service?.name}</p>
                    <span className={`badge text-xs ${STATUS_COLORS[apt.status as keyof typeof STATUS_COLORS]}`}>
                      {STATUS_LABELS[apt.status as keyof typeof STATUS_LABELS]}
                    </span>
                  </div>
                  {apt.paymentMethod && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Pagamento: {apt.paymentMethod.name}
                    </p>
                  )}
                  {apt.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{apt.notes}"</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(apt.value)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
