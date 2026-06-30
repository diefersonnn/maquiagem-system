import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import * as XLSX from 'xlsx'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

function getDateFilter(period: string, start?: string, end?: string) {
  const now = new Date()
  if (period === 'month') return { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
  if (period === 'year') return { gte: new Date(now.getFullYear(), 0, 1) }
  if (period === 'custom' && start && end) {
    return { gte: new Date(start), lte: new Date(end + 'T23:59:59') }
  }
  return { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
}

// Relatório financeiro
router.get('/financial', async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month', start, end } = req.query
    const dateFilter = getDateFilter(period as string, start as string, end as string)

    const income = await prisma.financial.aggregate({
      where: { type: 'INCOME', date: dateFilter },
      _sum: { value: true },
    })

    const expenses = await prisma.financial.aggregate({
      where: { type: 'EXPENSE', date: dateFilter },
      _sum: { value: true },
    })

    const incomeItems = await prisma.financial.findMany({
      where: { type: 'INCOME', date: dateFilter },
      include: {
        client: { select: { firstName: true, lastName: true } },
        paymentMethod: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    const expenseItems = await prisma.financial.findMany({
      where: { type: 'EXPENSE', date: dateFilter },
      orderBy: { date: 'desc' },
    })

    const byPaymentMethod = await prisma.financial.groupBy({
      by: ['paymentMethodId'],
      where: { type: 'INCOME', date: dateFilter },
      _sum: { value: true },
    })

    const paymentDetails = await Promise.all(
      byPaymentMethod.map(async (item) => {
        if (!item.paymentMethodId) return { name: 'Não informado', value: item._sum.value || 0 }
        const pm = await prisma.paymentMethod.findUnique({ where: { id: item.paymentMethodId } })
        return { name: pm?.name || 'Desconhecido', value: item._sum.value || 0 }
      })
    )

    return res.json({
      totalIncome: income._sum.value || 0,
      totalExpenses: expenses._sum.value || 0,
      netProfit: (income._sum.value || 0) - (expenses._sum.value || 0),
      incomeItems,
      expenseItems,
      byPaymentMethod: paymentDetails,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Relatório de clientes
router.get('/clients', async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month', start, end } = req.query
    const dateFilter = getDateFilter(period as string, start as string, end as string)

    const clients = await prisma.client.findMany({
      include: {
        appointments: {
          where: { status: 'COMPLETED', date: dateFilter },
        },
      },
    })

    const enriched = clients
      .map(client => ({
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        phone: client.phone,
        totalAppointments: client.appointments.length,
        totalSpent: client.appointments.reduce((sum, a) => sum + a.value, 0),
      }))
      .filter(c => c.totalAppointments > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)

    const topByFrequency = [...enriched].sort((a, b) => b.totalAppointments - a.totalAppointments).slice(0, 10)
    const topBySpending = enriched.slice(0, 10)

    return res.json({
      topByFrequency,
      topBySpending,
      allClients: enriched,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Relatório de serviços
router.get('/services', async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month', start, end } = req.query
    const dateFilter = getDateFilter(period as string, start as string, end as string)

    const serviceStats = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: { status: 'COMPLETED', date: dateFilter },
      _sum: { value: true },
      _count: true,
    })

    const withNames = await Promise.all(
      serviceStats.map(async (stat) => {
        const service = await prisma.service.findUnique({ where: { id: stat.serviceId } })
        return {
          name: service?.name || 'Desconhecido',
          count: stat._count,
          total: stat._sum.value || 0,
          average: (stat._sum.value || 0) / stat._count,
        }
      })
    )

    const sorted = withNames.sort((a, b) => b.count - a.count)

    return res.json({
      mostPerformed: sorted,
      mostProfitable: [...sorted].sort((a, b) => b.total - a.total),
    })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Exportar para Excel
router.get('/export/excel', async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'financial', period = 'month', start, end } = req.query
    const dateFilter = getDateFilter(period as string, start as string, end as string)

    let data: any[] = []
    let sheetName = 'Relatório'

    if (type === 'financial') {
      const items = await prisma.financial.findMany({
        where: { date: dateFilter },
        include: {
          client: { select: { firstName: true, lastName: true } },
          paymentMethod: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      })

      data = items.map(item => ({
        Data: item.date.toLocaleDateString('pt-BR'),
        Tipo: item.type === 'INCOME' ? 'Receita' : 'Despesa',
        Descrição: item.description,
        Cliente: item.client ? `${item.client.firstName} ${item.client.lastName}` : '-',
        'Forma de Pagamento': item.paymentMethod?.name || '-',
        Categoria: item.category || '-',
        Valor: item.value,
      }))
      sheetName = 'Financeiro'
    } else if (type === 'clients') {
      const clients = await prisma.client.findMany({
        include: {
          appointments: { where: { status: 'COMPLETED' } },
        },
        orderBy: { firstName: 'asc' },
      })

      data = clients.map(client => ({
        Nome: `${client.firstName} ${client.lastName}`,
        Celular: client.phone,
        'Total de Atendimentos': client.appointments.length,
        'Total Gasto': client.appointments.reduce((sum, a) => sum + a.value, 0),
        'Cadastrado em': client.createdAt.toLocaleDateString('pt-BR'),
      }))
      sheetName = 'Clientes'
    }

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Disposition', `attachment; filename=relatorio_${type}.xlsx`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return res.send(buffer)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro ao gerar exportação' })
  }
})

// Busca global
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query
    if (!q) return res.json({ clients: [], appointments: [], services: [] })

    const searchTerm = q as string

    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 5,
    })

    const services = await prisma.service.findMany({
      where: {
        name: { contains: searchTerm, mode: 'insensitive' },
      },
      take: 5,
    })

    const appointments = await prisma.appointment.findMany({
      where: {
        client: {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      },
      include: { client: true, service: true },
      take: 5,
      orderBy: { date: 'desc' },
    })

    return res.json({ clients, services, appointments })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
