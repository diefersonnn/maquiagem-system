import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' },
    })
    return res.json(services)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, price } = req.body

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nome e preço são obrigatórios' })
    }

    const service = await prisma.service.create({
      data: { name, price: parseFloat(price) },
    })
    return res.status(201).json(service)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, price, active } = req.body

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(active !== undefined && { active }),
      },
    })
    return res.json(service)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await prisma.service.update({ where: { id }, data: { active: false } })
    return res.json({ message: 'Serviço desativado com sucesso' })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
