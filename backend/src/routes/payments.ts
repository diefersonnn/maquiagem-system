import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })
    return res.json(methods)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })

    const method = await prisma.paymentMethod.create({ data: { name } })
    return res.status(201).json(method)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, active } = req.body
    const method = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(active !== undefined && { active }),
      },
    })
    return res.json(method)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await prisma.paymentMethod.update({ where: { id }, data: { active: false } })
    return res.json({ message: 'Forma de pagamento removida' })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
