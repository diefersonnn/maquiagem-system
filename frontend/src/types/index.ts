export interface User {
  id: string
  email: string
  name: string
  createdAt?: string
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string
  createdAt: string
  updatedAt: string
  totalSpent?: number
  totalAppointments?: number
  lastAppointment?: string | null
  nextAppointment?: string | null
}

export interface Service {
  id: string
  name: string
  price: number
  active: boolean
  createdAt: string
}

export interface PaymentMethod {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface Appointment {
  id: string
  clientId: string
  serviceId: string
  paymentMethodId?: string | null
  date: string
  status: AppointmentStatus
  notes?: string | null
  value: number
  createdAt: string
  updatedAt: string
  client?: Client
  service?: Service
  paymentMethod?: PaymentMethod | null
}

export type FinancialType = 'INCOME' | 'EXPENSE'

export interface Financial {
  id: string
  type: FinancialType
  clientId?: string | null
  appointmentId?: string | null
  paymentMethodId?: string | null
  description: string
  value: number
  date: string
  category?: string | null
  createdAt: string
  client?: { id: string; firstName: string; lastName: string } | null
  paymentMethod?: { id: string; name: string } | null
}

export interface InventoryItem {
  id: string
  name: string
  value: number
  purchaseDate: string
  notes?: string | null
  category?: string | null
  createdAt: string
}

export interface DashboardData {
  todayAppointments: Appointment[]
  upcomingAppointments: Appointment[]
  revenue: {
    day: number
    week: number
    month: number
    year: number
  }
  projection: {
    day: number
    month: number
  }
  expenses: {
    month: number
  }
  netProfit: number
  totalClients: number
  chartData: { day: string; value: number }[]
  serviceRevenue: { name: string; value: number; count: number }[]
}

export interface FinancialSummary {
  items: Financial[]
  summary: {
    totalIncome: number
    totalExpenses: number
    netProfit: number
  }
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Realizado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
}

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-700',
}
