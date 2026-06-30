/**
 * Camada de acesso ao Firestore — substitui todas as chamadas para o backend Express.
 * Cada função replica exatamente o que as rotas do Express faziam.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
  writeBatch, onSnapshot, setDoc,
} from 'firebase/firestore'
import { db } from './firebase'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(v: any): Date {
  if (!v) return new Date()
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date(v)
}

function docToObj(snap: any) {
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    createdAt: data.createdAt ? toDate(data.createdAt) : new Date(),
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : new Date(),
    date: data.date ? toDate(data.date) : undefined,
    purchaseDate: data.purchaseDate ? toDate(data.purchaseDate) : undefined,
  }
}

async function getAll(col: string, ...constraints: any[]) {
  const q = constraints.length
    ? query(collection(db, col), ...constraints)
    : query(collection(db, col), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(docToObj)
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export const clientsCol = () => collection(db, 'clients')

export async function getClients(search?: string) {
  const all = await getAll('clients', orderBy('firstName'))
  if (!search) return all
  const s = search.toLowerCase()
  return all.filter((c: any) =>
    c.firstName?.toLowerCase().includes(s) ||
    c.lastName?.toLowerCase().includes(s) ||
    c.phone?.includes(s)
  )
}

export async function getClient(id: string) {
  return docToObj(await getDoc(doc(db, 'clients', id)))
}

export async function createClient(data: any) {
  // Verificar duplicata de telefone
  const existing = await getDocs(query(collection(db, 'clients'), where('phone', '==', data.phone)))
  if (!existing.empty) throw new Error('Já existe um cliente com este número de celular')
  const ref = await addDoc(collection(db, 'clients'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return { id: ref.id, ...data }
}

export async function updateClient(id: string, data: any) {
  await updateDoc(doc(db, 'clients', id), { ...data, updatedAt: serverTimestamp() })
  return { id, ...data }
}

export async function deleteClient(id: string) {
  await deleteDoc(doc(db, 'clients', id))
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

export async function getServices(activeOnly = false) {
  const all = await getAll('services', orderBy('name'))
  return activeOnly ? all.filter((s: any) => s.active !== false) : all
}

export async function createService(data: any) {
  const ref = await addDoc(collection(db, 'services'), { ...data, active: true, createdAt: serverTimestamp() })
  return { id: ref.id, ...data, active: true }
}

export async function updateService(id: string, data: any) {
  await updateDoc(doc(db, 'services', id), { ...data, updatedAt: serverTimestamp() })
  return { id, ...data }
}

export async function deleteService(id: string) {
  await updateDoc(doc(db, 'services', id), { active: false, updatedAt: serverTimestamp() })
}

// ─── PAYMENT METHODS ─────────────────────────────────────────────────────────

export async function getPaymentMethods() {
  return getAll('paymentMethods', orderBy('name'))
}

export async function createPaymentMethod(name: string) {
  const ref = await addDoc(collection(db, 'paymentMethods'), { name, active: true, createdAt: serverTimestamp() })
  return { id: ref.id, name, active: true }
}

export async function deletePaymentMethod(id: string) {
  await deleteDoc(doc(db, 'paymentMethods', id))
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Record<string, { value: string; label: string | null }>> {
  const defaults = [{ key: 'appointment_interval_minutes', value: '45', label: 'Intervalo mínimo entre atendimentos (minutos)' }]
  const snap = await getDocs(collection(db, 'settings'))

  const map: Record<string, { value: string; label: string | null }> = {}
  snap.docs.forEach(d => { map[d.id] = d.data() as any })

  // Garantir defaults
  for (const def of defaults) {
    if (!map[def.key]) {
      await setDoc(doc(db, 'settings', def.key), { value: def.value, label: def.label })
      map[def.key] = { value: def.value, label: def.label }
    }
  }

  return map
}

export async function updateSetting(key: string, value: string) {
  await setDoc(doc(db, 'settings', key), { value }, { merge: true })
}

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

async function getIntervalMinutes(): Promise<number> {
  const snap = await getDoc(doc(db, 'settings', 'appointment_interval_minutes'))
  return snap.exists() ? parseInt(snap.data()!.value, 10) : 45
}

export async function getAppointments(start?: Date, end?: Date) {
  let constraints: any[] = [orderBy('date', 'asc')]
  if (start && end) {
    constraints = [
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'asc'),
    ]
  }
  const snap = await getDocs(query(collection(db, 'appointments'), ...constraints))
  const appointments = snap.docs.map(docToObj)

  // Enriquecer com dados de client e service
  return Promise.all(appointments.map(async (apt: any) => {
    const [clientSnap, serviceSnap, pmSnap] = await Promise.all([
      apt.clientId ? getDoc(doc(db, 'clients', apt.clientId)) : null,
      apt.serviceId ? getDoc(doc(db, 'services', apt.serviceId)) : null,
      apt.paymentMethodId ? getDoc(doc(db, 'paymentMethods', apt.paymentMethodId)) : null,
    ])
    return {
      ...apt,
      client: clientSnap?.exists() ? { id: clientSnap.id, ...clientSnap.data() } : null,
      service: serviceSnap?.exists() ? { id: serviceSnap.id, ...serviceSnap.data() } : null,
      paymentMethod: pmSnap?.exists() ? { id: pmSnap.id, ...pmSnap.data() } : null,
    }
  }))
}

export async function checkConflict(date: Date, excludeId?: string) {
  const intervalMinutes = await getIntervalMinutes()
  if (intervalMinutes <= 0) return { hasConflict: false, intervalMinutes }

  const windowStart = Timestamp.fromDate(new Date(date.getTime() - intervalMinutes * 60 * 1000))
  const windowEnd = Timestamp.fromDate(new Date(date.getTime() + intervalMinutes * 60 * 1000))

  // Apenas filtro por data (evita índice composto); status filtrado no client
  const snap = await getDocs(query(
    collection(db, 'appointments'),
    where('date', '>=', windowStart),
    where('date', '<=', windowEnd),
    orderBy('date'),
    limit(10),
  ))

  const conflict = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .find((a: any) => a.id !== excludeId && !['CANCELLED', 'NO_SHOW'].includes(a.status))

  return { hasConflict: !!conflict, conflictingAppointment: conflict || null, intervalMinutes }
}

export async function createAppointment(data: any, force = false) {
  const date = new Date(data.date)

  if (!force) {
    const { hasConflict, conflictingAppointment, intervalMinutes } = await checkConflict(date)
    if (hasConflict) {
      const err: any = new Error('SCHEDULE_CONFLICT')
      err.code = 'SCHEDULE_CONFLICT'
      err.conflictingAppointment = conflictingAppointment
      err.intervalMinutes = intervalMinutes
      throw err
    }
  }

  const ref = await addDoc(collection(db, 'appointments'), {
    ...data,
    date: Timestamp.fromDate(date),
    status: 'SCHEDULED',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: ref.id, ...data, status: 'SCHEDULED' }
}

export async function updateAppointment(id: string, data: any, force = false) {
  if (data.date && !force) {
    const { hasConflict, conflictingAppointment, intervalMinutes } = await checkConflict(new Date(data.date), id)
    if (hasConflict) {
      const err: any = new Error('SCHEDULE_CONFLICT')
      err.code = 'SCHEDULE_CONFLICT'
      err.conflictingAppointment = conflictingAppointment
      err.intervalMinutes = intervalMinutes
      throw err
    }
  }

  const payload: any = { ...data, updatedAt: serverTimestamp() }
  if (data.date) payload.date = Timestamp.fromDate(new Date(data.date))

  await updateDoc(doc(db, 'appointments', id), payload)

  if (data.status === 'COMPLETED') {
    await autoCreateFinancial(id)
  }

  return { id, ...data }
}

export async function updateAppointmentStatus(id: string, status: string) {
  await updateDoc(doc(db, 'appointments', id), { status, updatedAt: serverTimestamp() })
  if (status === 'COMPLETED') await autoCreateFinancial(id)
}

export async function deleteAppointment(id: string) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'appointments', id))

  // Remover financeiro vinculado
  const finSnap = await getDocs(query(collection(db, 'financials'), where('appointmentId', '==', id)))
  finSnap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
}

async function autoCreateFinancial(appointmentId: string) {
  // Não duplicar
  const existing = await getDocs(query(collection(db, 'financials'), where('appointmentId', '==', appointmentId)))
  if (!existing.empty) return

  const aptSnap = await getDoc(doc(db, 'appointments', appointmentId))
  if (!aptSnap.exists()) return
  const apt = { id: aptSnap.id, ...aptSnap.data() } as any

  const [clientSnap, serviceSnap] = await Promise.all([
    apt.clientId ? getDoc(doc(db, 'clients', apt.clientId)) : null,
    apt.serviceId ? getDoc(doc(db, 'services', apt.serviceId)) : null,
  ])

  const clientName = clientSnap?.exists()
    ? `${clientSnap.data()!.firstName} ${clientSnap.data()!.lastName}`
    : 'Cliente'
  const serviceName = serviceSnap?.exists() ? serviceSnap.data()!.name : 'Serviço'

  await addDoc(collection(db, 'financials'), {
    type: 'INCOME',
    clientId: apt.clientId || null,
    appointmentId,
    paymentMethodId: apt.paymentMethodId || null,
    description: `${serviceName} - ${clientName}`,
    value: apt.value,
    date: apt.date,
    category: 'Atendimento',
    createdAt: serverTimestamp(),
  })
}

// Auto-completar agendamentos passados (chamado ao abrir dashboard)
export async function autoCompleteExpiredAppointments() {
  const intervalMinutes = await getIntervalMinutes()
  const cutoff = Timestamp.fromDate(new Date(Date.now() - intervalMinutes * 60 * 1000))
  // Lookback de 30 dias — evita varrer todo o histórico e dispensa índice composto
  const lookback = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

  const snap = await getDocs(query(
    collection(db, 'appointments'),
    where('date', '>=', lookback),
    where('date', '<=', cutoff),
    orderBy('date'),
  ))

  const toComplete = snap.docs.filter(d => d.data().status === 'SCHEDULED')
  if (toComplete.length === 0) return

  const batch = writeBatch(db)
  toComplete.forEach(d => batch.update(d.ref, { status: 'COMPLETED', updatedAt: serverTimestamp() }))
  await batch.commit()

  for (const d of toComplete) {
    await autoCreateFinancial(d.id)
  }
}

// ─── FINANCIALS ───────────────────────────────────────────────────────────────

export async function getFinancials(start?: Date, end?: Date, type?: string) {
  let constraints: any[] = [orderBy('date', 'desc')]

  if (start && end && type) {
    constraints = [where('type', '==', type), where('date', '>=', Timestamp.fromDate(start)), where('date', '<=', Timestamp.fromDate(end)), orderBy('date', 'desc')]
  } else if (start && end) {
    constraints = [where('date', '>=', Timestamp.fromDate(start)), where('date', '<=', Timestamp.fromDate(end)), orderBy('date', 'desc')]
  } else if (type) {
    constraints = [where('type', '==', type), orderBy('date', 'desc')]
  }

  const snap = await getDocs(query(collection(db, 'financials'), ...constraints))
  return Promise.all(snap.docs.map(async (d) => {
    const data = { id: d.id, ...d.data(), date: toDate((d.data() as any).date) } as any
    const [clientSnap, pmSnap] = await Promise.all([
      data.clientId ? getDoc(doc(db, 'clients', data.clientId)) : null,
      data.paymentMethodId ? getDoc(doc(db, 'paymentMethods', data.paymentMethodId)) : null,
    ])
    return {
      ...data,
      client: clientSnap?.exists() ? { id: clientSnap.id, ...clientSnap.data() } : null,
      paymentMethod: pmSnap?.exists() ? { id: pmSnap.id, ...pmSnap.data() } : null,
    }
  }))
}

export async function createFinancial(data: any) {
  const ref = await addDoc(collection(db, 'financials'), {
    ...data,
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...data }
}

export async function updateFinancial(id: string, data: any) {
  const payload: any = { ...data, updatedAt: serverTimestamp() }
  if (data.date) payload.date = Timestamp.fromDate(new Date(data.date))
  await updateDoc(doc(db, 'financials', id), payload)
  return { id, ...data }
}

export async function deleteFinancial(id: string) {
  await deleteDoc(doc(db, 'financials', id))
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────

export async function getInventory() {
  return getAll('inventory', orderBy('purchaseDate', 'desc'))
}

export async function createInventoryItem(data: any) {
  const ref = await addDoc(collection(db, 'inventory'), {
    ...data,
    purchaseDate: Timestamp.fromDate(new Date(data.purchaseDate)),
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...data }
}

export async function updateInventoryItem(id: string, data: any) {
  const payload: any = { ...data, updatedAt: serverTimestamp() }
  if (data.purchaseDate) payload.purchaseDate = Timestamp.fromDate(new Date(data.purchaseDate))
  await updateDoc(doc(db, 'inventory', id), payload)
  return { id, ...data }
}

export async function deleteInventoryItem(id: string) {
  await deleteDoc(doc(db, 'inventory', id))
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboardData() {
  // Erro aqui nunca deve impedir o dashboard de carregar — é apenas housekeeping
  try { await autoCompleteExpiredAppointments() } catch { /* silencioso */ }

  const now = new Date()
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay     = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const startOfWeek  = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)

  // Busca primária: sem filtros = nunca falha por índice composto
  const [clientsSnap, allAppointmentsSnap, allFinancialsSnap, servicesSnap] = await Promise.all([
    getDocs(collection(db, 'clients')),
    getDocs(collection(db, 'appointments')),
    getDocs(collection(db, 'financials')),
    getDocs(collection(db, 'services')),
  ])

  const totalClients = clientsSnap.size

  // Processar financeiros client-side (evita qualquer query composta)
  const allFinancials = allFinancialsSnap.docs.map(d => ({
    id: d.id, ...d.data(), date: toDate((d.data() as any).date),
  } as any))

  const income  = (f: any[]) => f.filter(x => x.type === 'INCOME').reduce((s, x) => s + (x.value || 0), 0)
  const expense = (f: any[]) => f.filter(x => x.type === 'EXPENSE').reduce((s, x) => s + (x.value || 0), 0)
  const fin = (start: Date, end?: Date) => allFinancials.filter(f => {
    const d = f.date instanceof Date ? f.date : new Date(f.date)
    return d >= start && (end ? d <= end : true)
  })

  // Processar agendamentos client-side
  const allApts = allAppointmentsSnap.docs.map(d => ({
    id: d.id, ...d.data(), date: toDate((d.data() as any).date),
  } as any))

  const todayApts = allApts.filter((a: any) =>
    a.status !== 'CANCELLED' &&
    toDate(a.date) >= startOfDay &&
    toDate(a.date) <= endOfDay
  )

  const tomorrow = new Date(startOfDay); tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek  = new Date(startOfDay); nextWeek.setDate(nextWeek.getDate() + 7)
  const upcomingApts = allApts
    .filter((a: any) =>
      a.status === 'SCHEDULED' &&
      toDate(a.date) >= tomorrow &&
      toDate(a.date) <= nextWeek
    )
    .sort((a: any, b: any) => toDate(a.date).getTime() - toDate(b.date).getTime())
    .slice(0, 10)

  const scheduledApts = allApts.filter((a: any) => a.status === 'SCHEDULED')

  // Enriquecer agendamentos de hoje com dados relacionais
  const todayAppointments = await Promise.all(todayApts.map(async (apt: any) => {
    const [clientSnap, serviceSnap, pmSnap] = await Promise.all([
      apt.clientId ? getDoc(doc(db, 'clients', apt.clientId)) : null,
      apt.serviceId ? getDoc(doc(db, 'services', apt.serviceId)) : null,
      apt.paymentMethodId ? getDoc(doc(db, 'paymentMethods', apt.paymentMethodId)) : null,
    ])
    return {
      ...apt,
      client: clientSnap?.exists() ? { id: clientSnap.id, ...clientSnap.data() } : null,
      service: serviceSnap?.exists() ? { id: serviceSnap.id, ...serviceSnap.data() } : null,
      paymentMethod: pmSnap?.exists() ? { id: pmSnap.id, ...pmSnap.data() } : null,
    }
  }))

  // Enriquecer próximos agendamentos
  const upcomingAppointments = await Promise.all(upcomingApts.map(async (apt: any) => {
    const [cs, ss] = await Promise.all([
      apt.clientId ? getDoc(doc(db, 'clients', apt.clientId)) : null,
      apt.serviceId ? getDoc(doc(db, 'services', apt.serviceId)) : null,
    ])
    return {
      ...apt,
      client: cs?.exists() ? { id: cs.id, ...cs.data() } : null,
      service: ss?.exists() ? { id: ss.id, ...ss.data() } : null,
    }
  }))

  // Projeções
  const projectedDay   = scheduledApts.filter((a: any) => { const d = toDate(a.date); return d >= startOfDay && d <= endOfDay }).reduce((s: number, a: any) => s + (a.value || 0), 0)
  const projectedMonth = scheduledApts.filter((a: any) => toDate(a.date) >= startOfMonth).reduce((s: number, a: any) => s + (a.value || 0), 0)

  // Chart data
  const monthFin = fin(startOfMonth)
  const dailyRevenue: Record<string, number> = {}
  monthFin.filter((f: any) => f.type === 'INCOME').forEach((f: any) => {
    const day = (f.date instanceof Date ? f.date : new Date(f.date)).getDate().toString()
    dailyRevenue[day] = (dailyRevenue[day] || 0) + f.value
  })
  const chartData = Array.from({ length: now.getDate() }, (_, i) => ({
    day: (i + 1).toString(), value: dailyRevenue[(i + 1).toString()] || 0,
  }))

  const monthIncome   = income(fin(startOfMonth))
  const monthExpenses = expense(fin(startOfMonth))

  // Serviços do mês — agendamentos COMPLETED no mês agrupados por serviço
  const serviceNameMap: Record<string, string> = {}
  servicesSnap.docs.forEach(d => { serviceNameMap[d.id] = (d.data() as any).name || 'Serviço' })

  const serviceRevenueMap: Record<string, { name: string; value: number; count: number }> = {}
  allApts
    .filter((a: any) => a.status === 'COMPLETED' && toDate(a.date) >= startOfMonth)
    .forEach((a: any) => {
      const key = a.serviceId || '__sem_servico__'
      const name = a.serviceId ? (serviceNameMap[a.serviceId] || 'Serviço') : 'Avulso'
      if (!serviceRevenueMap[key]) serviceRevenueMap[key] = { name, value: 0, count: 0 }
      serviceRevenueMap[key].value += a.value || 0
      serviceRevenueMap[key].count++
    })
  const serviceRevenue = Object.values(serviceRevenueMap).sort((a, b) => b.value - a.value)

  return {
    todayAppointments,
    upcomingAppointments,
    revenue: {
      day:   income(fin(startOfDay, endOfDay)),
      week:  income(fin(startOfWeek)),
      month: monthIncome,
      year:  income(fin(startOfYear)),
    },
    projection: { day: projectedDay, month: projectedMonth },
    expenses: { month: monthExpenses },
    netProfit: monthIncome - monthExpenses,
    totalClients,
    chartData,
    serviceRevenue,
  }
}
