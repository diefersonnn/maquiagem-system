import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, category } = req.query
    const where: any = {}

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' }
    }
    if (category) {
      where.category = category
    }

    const items = await prisma.inventory.findMany({
      where,
      orderBy: { purchaseDate: 'desc' },
    })

    const totalSpent = items.reduce((sum, item) => sum + item.value, 0)

    const categories = await prisma.inventory.groupBy({
      by: ['category'],
      _sum: { value: true },
      _count: true,
    })

    return res.json({
      items,
      totalSpent,
      categories: categories.map(c => ({
        name: c.category || 'Sem categoria',
        count: c._count,
        total: c._sum.value || 0,
      })),
    })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, value, purchaseDate, notes, category } = req.body

    if (!name || !value || !purchaseDate) {
      return res.status(400).json({ error: 'Nome, valor e data são obrigatórios' })
    }

    const item = await prisma.inventory.create({
      data: {
        name,
        value: parseFloat(value),
        purchaseDate: new Date(purchaseDate),
        notes: notes || null,
        category: category || null,
      },
    })

    return res.status(201).json(item)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, value, purchaseDate, notes, category } = req.body

    const item = await prisma.inventory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(purchaseDate && { purchaseDate: new Date(purchaseDate) }),
        ...(notes !== undefined && { notes }),
        ...(category !== undefined && { category }),
      },
    })

    return res.json(item)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.inventory.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Item removido com sucesso' })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
