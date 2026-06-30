import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

// Listar todos os clientes
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query
    const where: any = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: { select: { appointments: true } },
      },
      orderBy: { firstName: 'asc' },
    })

    // Enriquecer com dados de resumo
    const enriched = await Promise.all(
      clients.map(async (client) => {
        const stats = await prisma.appointment.aggregate({
          where: { clientId: client.id, status: 'COMPLETED' },
          _sum: { value: true },
          _count: true,
        })

        const lastAppointment = await prisma.appointment.findFirst({
          where: { clientId: client.id, status: 'COMPLETED' },
          orderBy: { date: 'desc' },
          select: { date: true },
        })

        const nextAppointment = await prisma.appointment.findFirst({
          where: {
            clientId: client.id,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
          select: { date: true },
        })

        return {
          ...client,
          totalSpent: stats._sum.value || 0,
          totalAppointments: stats._count,
          lastAppointment: lastAppointment?.date || null,
          nextAppointment: nextAppointment?.date || null,
        }
      })
    )

    return res.json(enriched)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Buscar cliente por ID com histórico completo
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const client = await prisma.client.findUnique({
      where: { id },
    })

    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' })
    }

    const appointments = await prisma.appointment.findMany({
      where: { clientId: id },
      include: {
        service: true,
        paymentMethod: true,
      },
      orderBy: { date: 'desc' },
    })

    const stats = await prisma.appointment.aggregate({
      where: { clientId: id, status: 'COMPLETED' },
      _sum: { value: true },
      _count: true,
    })

    const lastAppointment = appointments.find(a => a.status === 'COMPLETED')
    const nextAppointment = appointments.find(
      a => ['SCHEDULED', 'CONFIRMED'].includes(a.status) && a.date >= new Date()
    )

    return res.json({
      ...client,
      appointments,
      totalAppointments: stats._count,
      totalSpent: stats._sum.value || 0,
      lastAppointment: lastAppointment?.date || null,
      nextAppointment: nextAppointment?.date || null,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Criar cliente
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone } = req.body

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ error: 'Nome, sobrenome e celular são obrigatórios' })
    }

    const existing = await prisma.client.findUnique({ where: { phone } })
    if (existing) {
      return res.status(400).json({ error: 'Já existe um cliente com este celular' })
    }

    const client = await prisma.client.create({
      data: { firstName, lastName, phone },
    })

    return res.status(201).json(client)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Atualizar cliente
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { firstName, lastName, phone } = req.body

    if (phone) {
      const existing = await prisma.client.findFirst({
        where: { phone, NOT: { id } },
      })
      if (existing) {
        return res.status(400).json({ error: 'Já existe um cliente com este celular' })
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: { firstName, lastName, phone },
    })

    return res.json(client)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Deletar cliente
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await prisma.client.delete({ where: { id } })
    return res.json({ message: 'Cliente removido com sucesso' })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
