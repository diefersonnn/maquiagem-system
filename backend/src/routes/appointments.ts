import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

async function getIntervalMinutes(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'appointment_interval_minutes' },
  })
  return setting ? parseInt(setting.value, 10) : 45
}

// Verifica se há conflito de horário
// Um agendamento conflita se existir outro (não cancelado/faltou) dentro da janela de intervalo
async function checkConflict(
  date: Date,
  excludeId?: string
): Promise<{ hasConflict: boolean; conflictingAppointment?: any }> {
  const intervalMinutes = await getIntervalMinutes()

  if (intervalMinutes <= 0) return { hasConflict: false }

  const windowStart = new Date(date.getTime() - intervalMinutes * 60 * 1000)
  const windowEnd = new Date(date.getTime() + intervalMinutes * 60 * 1000)

  const existing = await prisma.appointment.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      date: { gte: windowStart, lte: windowEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    include: { client: true, service: true },
    orderBy: { date: 'asc' },
  })

  return { hasConflict: !!existing, conflictingAppointment: existing }
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { start, end, status, clientId } = req.query

    const where: any = {}

    if (start && end) {
      where.date = {
        gte: new Date(start as string),
        lte: new Date(end as string),
      }
    } else if (start) {
      where.date = { gte: new Date(start as string) }
    }

    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: true,
        service: true,
        paymentMethod: true,
      },
      orderBy: { date: 'asc' },
    })

    return res.json(appointments)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { client: true, service: true, paymentMethod: true },
    })

    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' })

    return res.json(appointment)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para verificar conflito antes de salvar (usado pelo frontend)
router.post('/check-conflict', async (req: AuthRequest, res: Response) => {
  try {
    const { date, excludeId } = req.body
    if (!date) return res.status(400).json({ error: 'Data é obrigatória' })

    const intervalMinutes = await getIntervalMinutes()
    const result = await checkConflict(new Date(date), excludeId)

    return res.json({
      hasConflict: result.hasConflict,
      intervalMinutes,
      conflictingAppointment: result.conflictingAppointment,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, serviceId, paymentMethodId, date, notes, value, force } = req.body

    if (!clientId || !serviceId || !date) {
      return res.status(400).json({ error: 'Cliente, serviço e data são obrigatórios' })
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return res.status(404).json({ error: 'Serviço não encontrado' })

    const appointmentDate = new Date(date)

    // Verificar conflito (a menos que force=true venha do frontend)
    if (!force) {
      const { hasConflict, conflictingAppointment, intervalMinutes } = await checkConflict(appointmentDate) as any
      if (hasConflict) {
        const conflictTime = new Date(conflictingAppointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        return res.status(409).json({
          error: `Conflito de horário: existe um agendamento às ${conflictTime} (${conflictingAppointment.client.firstName} ${conflictingAppointment.client.lastName} — ${conflictingAppointment.service.name}). O intervalo mínimo é de ${intervalMinutes} minutos.`,
          code: 'SCHEDULE_CONFLICT',
          conflictingAppointment,
          intervalMinutes,
        })
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        serviceId,
        paymentMethodId: paymentMethodId || null,
        date: appointmentDate,
        notes: notes || null,
        value: value !== undefined ? parseFloat(value) : service.price,
        status: 'SCHEDULED',
      },
      include: { client: true, service: true, paymentMethod: true },
    })

    return res.status(201).json(appointment)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { clientId, serviceId, paymentMethodId, date, notes, value, status, force } = req.body

    // Verificar conflito ao alterar horário
    if (date && !force) {
      const { hasConflict, conflictingAppointment, intervalMinutes } = await checkConflict(new Date(date), id) as any
      if (hasConflict) {
        const conflictTime = new Date(conflictingAppointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        return res.status(409).json({
          error: `Conflito de horário: existe um agendamento às ${conflictTime} (${conflictingAppointment.client.firstName} ${conflictingAppointment.client.lastName} — ${conflictingAppointment.service.name}). O intervalo mínimo é de ${intervalMinutes} minutos.`,
          code: 'SCHEDULE_CONFLICT',
          conflictingAppointment,
          intervalMinutes,
        })
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(clientId && { clientId }),
        ...(serviceId && { serviceId }),
        ...(paymentMethodId !== undefined && { paymentMethodId }),
        ...(date && { date: new Date(date) }),
        ...(notes !== undefined && { notes }),
        ...(value !== undefined && { value: parseFloat(value) }),
        ...(status && { status }),
      },
      include: { client: true, service: true, paymentMethod: true },
    })

    if (status === 'COMPLETED') {
      const existingFinancial = await prisma.financial.findFirst({ where: { appointmentId: id } })
      if (!existingFinancial) {
        const client = await prisma.client.findUnique({ where: { id: appointment.clientId } })
        const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } })
        await prisma.financial.create({
          data: {
            type: 'INCOME',
            clientId: appointment.clientId,
            appointmentId: appointment.id,
            paymentMethodId: appointment.paymentMethodId,
            description: `${service?.name} - ${client?.firstName} ${client?.lastName}`,
            value: appointment.value,
            date: appointment.date,
            category: 'Atendimento',
          },
        })
      }
    }

    return res.json(appointment)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: { client: true, service: true, paymentMethod: true },
    })

    if (status === 'COMPLETED') {
      const existingFinancial = await prisma.financial.findFirst({ where: { appointmentId: id } })
      if (!existingFinancial) {
        const client = await prisma.client.findUnique({ where: { id: appointment.clientId } })
        const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } })
        await prisma.financial.create({
          data: {
            type: 'INCOME',
            clientId: appointment.clientId,
            appointmentId: appointment.id,
            paymentMethodId: appointment.paymentMethodId,
            description: `${service?.name} - ${client?.firstName} ${client?.lastName}`,
            value: appointment.value,
            date: new Date(),
            category: 'Atendimento',
          },
        })
      }
    }

    return res.json(appointment)
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await prisma.financial.deleteMany({ where: { appointmentId: id } })
    await prisma.appointment.delete({ where: { id } })
    return res.json({ message: 'Agendamento removido com sucesso' })
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
