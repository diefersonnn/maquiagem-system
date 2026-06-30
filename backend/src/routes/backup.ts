import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import fs from 'fs'
import path from 'path'

const router = Router()
const prisma = new PrismaClient()

const BACKUP_DIR = process.env.BACKUP_DIR || './backups'

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

async function createBackupData() {
  const clients = await prisma.client.findMany()
  const services = await prisma.service.findMany()
  const paymentMethods = await prisma.paymentMethod.findMany()
  const appointments = await prisma.appointment.findMany()
  const financials = await prisma.financial.findMany()
  const inventory = await prisma.inventory.findMany()

  return {
    version: '1.0',
    createdAt: new Date().toISOString(),
    data: { clients, services, paymentMethods, appointments, financials, inventory },
  }
}

router.use(authMiddleware)

// Criar backup manual
router.post('/create', async (req: AuthRequest, res: Response) => {
  try {
    const backupData = await createBackupData()
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const filepath = path.join(BACKUP_DIR, filename)

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8')

    return res.json({
      message: 'Backup criado com sucesso',
      filename,
      size: fs.statSync(filepath).size,
      createdAt: backupData.createdAt,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro ao criar backup' })
  }
})

// Listar backups disponíveis
router.get('/list', async (req: AuthRequest, res: Response) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json([])
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filepath = path.join(BACKUP_DIR, filename)
        const stat = fs.statSync(filepath)
        return {
          filename,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return res.json(files)
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar backups' })
  }
})

// Fazer download de backup
router.get('/download/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params
    const filepath = path.join(BACKUP_DIR, filename)

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Backup não encontrado' })
    }

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
    res.setHeader('Content-Type', 'application/json')
    return res.sendFile(path.resolve(filepath))
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao baixar backup' })
  }
})

// Restaurar backup
router.post('/restore/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params
    const filepath = path.join(BACKUP_DIR, filename)

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Arquivo de backup não encontrado' })
    }

    const backupContent = fs.readFileSync(filepath, 'utf-8')
    const backup = JSON.parse(backupContent)

    if (!backup.data) {
      return res.status(400).json({ error: 'Formato de backup inválido' })
    }

    // Criar backup atual antes de restaurar
    const currentBackupData = await createBackupData()
    const currentFilename = `backup_pre_restore_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    fs.writeFileSync(path.join(BACKUP_DIR, currentFilename), JSON.stringify(currentBackupData, null, 2))

    const { clients, services, paymentMethods, appointments, financials, inventory } = backup.data

    // Restaurar dados (usando transação)
    await prisma.$transaction(async (tx) => {
      await tx.financial.deleteMany()
      await tx.appointment.deleteMany()
      await tx.inventory.deleteMany()
      await tx.client.deleteMany()
      await tx.service.deleteMany()
      await tx.paymentMethod.deleteMany()

      if (paymentMethods?.length) await tx.paymentMethod.createMany({ data: paymentMethods })
      if (services?.length) await tx.service.createMany({ data: services })
      if (clients?.length) await tx.client.createMany({ data: clients })
      if (appointments?.length) await tx.appointment.createMany({ data: appointments })
      if (financials?.length) await tx.financial.createMany({ data: financials })
      if (inventory?.length) await tx.inventory.createMany({ data: inventory })
    })

    return res.json({
      message: 'Backup restaurado com sucesso',
      preRestoreBackup: currentFilename,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro ao restaurar backup' })
  }
})

// Deletar backup
router.delete('/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params
    const filepath = path.join(BACKUP_DIR, filename)

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Backup não encontrado' })
    }

    fs.unlinkSync(filepath)
    return res.json({ message: 'Backup removido com sucesso' })
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover backup' })
  }
})

export { createBackupData }
export default router
