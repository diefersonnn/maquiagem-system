import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// Listar todas as entradas financeiras (receitas e despesas)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, start, end, period } = req.query

    const where: any = {}

    if (type) where.type = type

    // Filtro por período
    const now = new Date()
    if (period === 'today') {
      where.date = {
        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      }
    } else if (period === 'week') {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      where.date = { gte: startOfWeek }
    } else if (period === 'month') {
      where.date = { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    } else if (period === 'year') {
      where.date = { gte: new Date(now.getFullYear(), 0, 1) }
    } else if (start && end) {
      where.date = {
        gte: new Date(start as string),
        lte: new Date(end as string + 'T23:59:59'),
      }
    }

    const financials = await prisma.financial.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    })

    const totalIncome = financials
      .filter(f => f.type === 'INCOME')
      .reduce((sum, f) => sum + f.value, 0)

    const totalExpenses = financials
      .filter(f => f.type === 'EXPENSE')
      .reduce((sum, f) => sum + f.value, 0)

    return res.json({
      items: financials,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
      },
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Registrar despesa manual
router.post('/expense', async (req: AuthRequest, res: Response) => {
  try {
    const { description, value, date, category } = req.body

    if (!description || !value || !date) {
      return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios' })
    }

    const financial = await prisma.financial.create({
      data: {
        type: 'EXPENSE',
        description,
        value: parseFloat(value),
        date: new Date(date),
        category: category || 'Outros',
      },
    })

    return res.status(201).json(financial)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Registrar receita manual
router.post('/income', async (req: AuthRequest, res: Response) => {
  try {
    const { description, value, date, paymentMethodId, clientId, category } = req.body

    if (!description || !value || !date) {
      return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios' })
    }

    const financial = await prisma.financial.create({
      data: {
        type: 'INCOME',
        description,
        value: parseFloat(value),
        date: new Date(date),
        paymentMethodId: paymentMethodId || null,
        clientId: clientId || null,
        category: category || 'Atendimento',
      },
    })

    return res.status(201).json(financial)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Atualizar entrada financeira
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { description, value, date, category, paymentMethodId } = req.body

    const financial = await prisma.financial.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(date && { date: new Date(date) }),
        ...(category && { category }),
        ...(paymentMethodId !== undefined && { paymentMethodId }),
      },
    })

    return res.json(financial)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Deletar entrada financeira
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await prisma.financial.delete({ where: { id } })
    return res.json({ message: 'Entrada removida com sucesso' })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Fluxo de caixa por período
router.get('/cashflow/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { period, start, end } = req.query

    const now = new Date()
    let dateFilter: any = {}

    if (period === 'today') {
      dateFilter = {
        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
      }
    } else if (period === 'week') {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      dateFilter = { gte: startOfWeek }
    } else if (period === 'month') {
      dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    } else if (period === 'year') {
      dateFilter = { gte: new Date(now.getFullYear(), 0, 1) }
    } else if (start && end) {
      dateFilter = {
        gte: new Date(start as string),
        lte: new Date(end as string + 'T23:59:59'),
      }
    }

    const income = await prisma.financial.aggregate({
      where: { type: 'INCOME', date: dateFilter },
      _sum: { value: true },
    })

    const expenses = await prisma.financial.aggregate({
      where: { type: 'EXPENSE', date: dateFilter },
      _sum: { value: true },
    })

    // Agrupado por forma de pagamento (receitas)
    const byPaymentMethod = await prisma.financial.groupBy({
      by: ['paymentMethodId'],
      where: { type: 'INCOME', date: dateFilter },
      _sum: { value: true },
    })

    const paymentMethodDetails = await Promise.all(
      byPaymentMethod.map(async (item) => {
        if (!item.paymentMethodId) return { name: 'Sem método', value: item._sum.value || 0 }
        const pm = await prisma.paymentMethod.findUnique({ where: { id: item.paymentMethodId } })
        return { name: pm?.name || 'Desconhecido', value: item._sum.value || 0 }
      })
    )

    // Agrupado por categoria (despesas)
    const byCategory = await prisma.financial.groupBy({
      by: ['category'],
      where: { type: 'EXPENSE', date: dateFilter },
      _sum: { value: true },
    })

    return res.json({
      income: income._sum.value || 0,
      expenses: expenses._sum.value || 0,
      netProfit: (income._sum.value || 0) - (expenses._sum.value || 0),
      byPaymentMethod: paymentMethodDetails,
      expensesByCategory: byCategory.map(c => ({
        category: c.category || 'Outros',
        value: c._sum.value || 0,
      })),
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
