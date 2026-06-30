import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Agendamentos de hoje
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
      include: {
        client: true,
        service: true,
        paymentMethod: true,
      },
      orderBy: { date: 'asc' },
    })

    // Próximos agendamentos (amanhã em diante)
    const tomorrow = new Date(startOfDay)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(startOfDay)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        date: { gte: tomorrow, lte: nextWeek },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        client: true,
        service: true,
      },
      orderBy: { date: 'asc' },
      take: 10,
    })

    // Faturamento do dia
    const dayIncome = await prisma.financial.aggregate({
      where: { type: 'INCOME', date: { gte: startOfDay, lte: endOfDay } },
      _sum: { value: true },
    })

    // Faturamento da semana
    const weekIncome = await prisma.financial.aggregate({
      where: { type: 'INCOME', date: { gte: startOfWeek } },
      _sum: { value: true },
    })

    // Faturamento do mês
    const monthIncome = await prisma.financial.aggregate({
      where: { type: 'INCOME', date: { gte: startOfMonth } },
      _sum: { value: true },
    })

    // Faturamento do ano
    const yearIncome = await prisma.financial.aggregate({
      where: { type: 'INCOME', date: { gte: startOfYear } },
      _sum: { value: true },
    })

    // Despesas do mês
    const monthExpenses = await prisma.financial.aggregate({
      where: { type: 'EXPENSE', date: { gte: startOfMonth } },
      _sum: { value: true },
    })

    // Total de clientes
    const totalClients = await prisma.client.count()

    // Lucro líquido do mês
    const netProfit = (monthIncome._sum.value || 0) - (monthExpenses._sum.value || 0)

    // Faturamento por dia do mês atual (para gráfico)
    const monthFinancials = await prisma.financial.findMany({
      where: { type: 'INCOME', date: { gte: startOfMonth } },
      select: { date: true, value: true },
    })

    const dailyRevenue: Record<string, number> = {}
    monthFinancials.forEach(f => {
      const day = f.date.getDate().toString()
      dailyRevenue[day] = (dailyRevenue[day] || 0) + f.value
    })

    const chartData = Array.from({ length: now.getDate() }, (_, i) => ({
      day: (i + 1).toString(),
      value: dailyRevenue[(i + 1).toString()] || 0,
    }))

    // Projeção: agendamentos SCHEDULED do mês que ainda não foram concluídos
    const projectedMonth = await prisma.appointment.aggregate({
      where: {
        status: 'SCHEDULED',
        date: { gte: startOfMonth },
      },
      _sum: { value: true },
    })

    // Projeção de hoje: agendamentos SCHEDULED de hoje
    const projectedDay = await prisma.appointment.aggregate({
      where: {
        status: 'SCHEDULED',
        date: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { value: true },
    })

    // Faturamento por serviço no mês
    const serviceRevenue = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        status: 'COMPLETED',
        date: { gte: startOfMonth },
      },
      _sum: { value: true },
      _count: true,
    })

    const serviceRevenueWithNames = await Promise.all(
      serviceRevenue.map(async (sr) => {
        const service = await prisma.service.findUnique({ where: { id: sr.serviceId } })
        return {
          name: service?.name || 'Desconhecido',
          value: sr._sum.value || 0,
          count: sr._count,
        }
      })
    )

    return res.json({
      todayAppointments,
      upcomingAppointments,
      revenue: {
        day: dayIncome._sum.value || 0,
        week: weekIncome._sum.value || 0,
        month: monthIncome._sum.value || 0,
        year: yearIncome._sum.value || 0,
      },
      projection: {
        day: projectedDay._sum.value || 0,
        month: projectedMonth._sum.value || 0,
      },
      expenses: {
        month: monthExpenses._sum.value || 0,
      },
      netProfit,
      totalClients,
      chartData,
      serviceRevenue: serviceRevenueWithNames,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
