import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import fs from 'fs'
import path from 'path'

import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth'
import dashboardRoutes from './routes/dashboard'
import clientRoutes from './routes/clients'
import serviceRoutes from './routes/services'
import paymentRoutes from './routes/payments'
import appointmentRoutes from './routes/appointments'
import financialRoutes from './routes/financial'
import inventoryRoutes from './routes/inventory'
import reportsRoutes from './routes/reports'
import backupRoutes, { createBackupData } from './routes/backup'
import settingsRoutes from './routes/settings'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001
const BACKUP_DIR = process.env.BACKUP_DIR || './backups'

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]

app.use(cors({
  origin: (origin, callback) => {
    // Permitir chamadas sem origin (ex: mobile apps, curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rotas
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/payment-methods', paymentRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/financial', financialRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/settings', settingsRoutes)

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auto-conclusão de agendamentos: roda a cada minuto
cron.schedule('* * * * *', async () => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'appointment_interval_minutes' } })
    const intervalMinutes = setting ? parseInt(setting.value, 10) : 45

    const cutoff = new Date(Date.now() - intervalMinutes * 60 * 1000)

    const toComplete = await prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        date: { lte: cutoff },
      },
      include: { client: true, service: true },
    })

    for (const apt of toComplete) {
      await prisma.appointment.update({ where: { id: apt.id }, data: { status: 'COMPLETED' } })

      const existing = await prisma.financial.findFirst({ where: { appointmentId: apt.id } })
      if (!existing) {
        await prisma.financial.create({
          data: {
            type: 'INCOME',
            clientId: apt.clientId,
            appointmentId: apt.id,
            paymentMethodId: apt.paymentMethodId,
            description: `${apt.service.name} - ${apt.client.firstName} ${apt.client.lastName}`,
            value: apt.value,
            date: apt.date,
            category: 'Atendimento',
          },
        })
      }
    }

    if (toComplete.length > 0) {
      console.log(`[AutoComplete] ${toComplete.length} agendamento(s) concluído(s) automaticamente`)
    }
  } catch (error) {
    console.error('[AutoComplete] Erro:', error)
  }
})

// Backup automático diário às 2h da manhã
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('[Backup] Iniciando backup automático...')
    const backupData = await createBackupData()
    const filename = `backup_auto_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const filepath = path.join(BACKUP_DIR, filename)
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2))
    console.log(`[Backup] Backup automático criado: ${filename}`)

    // Manter apenas os últimos 30 backups automáticos
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_auto_'))
      .sort()
      .reverse()

    if (files.length > 30) {
      files.slice(30).forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f))
      })
    }
  } catch (error) {
    console.error('[Backup] Erro no backup automático:', error)
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`)
  console.log(`📊 API disponível em http://localhost:${PORT}/api`)
  console.log(`\n📧 Admin: admin@maquiadora.com | 🔑 Senha: admin123\n`)
})
