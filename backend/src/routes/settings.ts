import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Configurações padrão
const DEFAULT_SETTINGS = [
  {
    key: 'appointment_interval_minutes',
    value: '45',
    label: 'Intervalo mínimo entre atendimentos (minutos)',
  },
]

router.use(authMiddleware)

// Garantir que as configurações padrão existam
async function ensureDefaults() {
  for (const s of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    await ensureDefaults()
    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } })
    // Retornar como objeto chave → valor para facilitar no frontend
    const map: Record<string, { value: string; label: string | null }> = {}
    for (const s of settings) {
      map[s.key] = { value: s.value, label: s.label }
    }
    return res.json(map)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.put('/:key', async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params
    const { value } = req.body

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Valor é obrigatório' })
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })

    return res.json(setting)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export { ensureDefaults }
export default router
