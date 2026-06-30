import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // Usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@maquiadora.com' },
    update: {},
    create: {
      email: 'admin@maquiadora.com',
      password: hashedPassword,
      name: 'Administrador',
    },
  })
  console.log('Usuário admin criado:', admin.email)

  // Serviços padrão
  const services = [
    { name: 'Em Espera', price: 0 },
    { name: 'Sem Cílios', price: 90 },
    { name: 'Com Cílios', price: 90 },
    { name: 'Infantil sem Vídeo', price: 50 },
    { name: 'Infantil com Vídeo', price: 70 },
    { name: 'Curso Automaquiagem', price: 180 },
    { name: 'Curso Infantil', price: 140 },
    { name: 'Curso Profissional', price: 800 },
    { name: 'Colagem de Cílios', price: 20 },
  ]

  const existingServices = await prisma.service.count()
  if (existingServices === 0) {
    await prisma.service.createMany({ data: services })
  }
  console.log('Serviços criados:', services.length)

  // Formas de pagamento
  const paymentMethodsData = [{ name: 'PIX' }, { name: 'Cartão' }, { name: 'Dinheiro' }]
  const existingPayments = await prisma.paymentMethod.count()
  if (existingPayments === 0) {
    await prisma.paymentMethod.createMany({ data: paymentMethodsData })
  }
  console.log('Formas de pagamento criadas:', paymentMethodsData.length)

  // Clientes de exemplo
  const clientsData = [
    { firstName: 'Ana', lastName: 'Silva', phone: '(11) 99999-0001' },
    { firstName: 'Maria', lastName: 'Santos', phone: '(11) 99999-0002' },
    { firstName: 'Julia', lastName: 'Oliveira', phone: '(11) 99999-0003' },
    { firstName: 'Carla', lastName: 'Costa', phone: '(11) 99999-0004' },
    { firstName: 'Fernanda', lastName: 'Lima', phone: '(11) 99999-0005' },
    { firstName: 'Beatriz', lastName: 'Pereira', phone: '(11) 99999-0006' },
    { firstName: 'Camila', lastName: 'Rodrigues', phone: '(11) 99999-0007' },
    { firstName: 'Patricia', lastName: 'Alves', phone: '(11) 99999-0008' },
  ]

  const createdClients = []
  for (const client of clientsData) {
    const c = await prisma.client.upsert({
      where: { phone: client.phone },
      update: {},
      create: client,
    })
    createdClients.push(c)
  }
  console.log('Clientes criados:', createdClients.length)

  // Buscar serviços e formas de pagamento criados
  const allServices = await prisma.service.findMany()
  const allPayments = await prisma.paymentMethod.findMany()

  const pixMethod = allPayments.find(p => p.name === 'PIX')!
  const cardMethod = allPayments.find(p => p.name === 'Cartão')!
  const cashMethod = allPayments.find(p => p.name === 'Dinheiro')!

  const semCiliosService = allServices.find(s => s.name === 'Sem Cílios')!
  const comCiliosService = allServices.find(s => s.name === 'Com Cílios')!
  const infantilService = allServices.find(s => s.name === 'Infantil sem Vídeo')!
  const cursoAutoService = allServices.find(s => s.name === 'Curso Automaquiagem')!

  // Agendamentos de exemplo (histórico)
  const now = new Date()
  const appointmentsData = [
    {
      clientId: createdClients[0].id,
      serviceId: comCiliosService.id,
      paymentMethodId: pixMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
      status: 'COMPLETED' as const,
      value: 90,
      notes: 'Cliente preferiu make natural',
    },
    {
      clientId: createdClients[0].id,
      serviceId: semCiliosService.id,
      paymentMethodId: cardMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15),
      status: 'COMPLETED' as const,
      value: 90,
      notes: null,
    },
    {
      clientId: createdClients[1].id,
      serviceId: comCiliosService.id,
      paymentMethodId: pixMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 20),
      status: 'COMPLETED' as const,
      value: 90,
      notes: null,
    },
    {
      clientId: createdClients[2].id,
      serviceId: infantilService.id,
      paymentMethodId: cashMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10),
      status: 'COMPLETED' as const,
      value: 50,
      notes: 'Festa de aniversário',
    },
    {
      clientId: createdClients[3].id,
      serviceId: cursoAutoService.id,
      paymentMethodId: pixMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
      status: 'COMPLETED' as const,
      value: 180,
      notes: null,
    },
    {
      clientId: createdClients[4].id,
      serviceId: semCiliosService.id,
      paymentMethodId: pixMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
      status: 'COMPLETED' as const,
      value: 90,
      notes: null,
    },
    // Agendamentos futuros
    {
      clientId: createdClients[0].id,
      serviceId: comCiliosService.id,
      paymentMethodId: pixMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0),
      status: 'CONFIRMED' as const,
      value: 90,
      notes: 'Formatura',
    },
    {
      clientId: createdClients[5].id,
      serviceId: semCiliosService.id,
      paymentMethodId: cardMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
      status: 'SCHEDULED' as const,
      value: 90,
      notes: null,
    },
    {
      clientId: createdClients[6].id,
      serviceId: infantilService.id,
      paymentMethodId: cashMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0),
      status: 'SCHEDULED' as const,
      value: 50,
      notes: 'Festa junina',
    },
    {
      clientId: createdClients[7].id,
      serviceId: comCiliosService.id,
      paymentMethodId: pixMethod.id,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 15, 30),
      status: 'SCHEDULED' as const,
      value: 90,
      notes: null,
    },
  ]

  const createdAppointments = []
  for (const apt of appointmentsData) {
    const a = await prisma.appointment.create({ data: apt })
    createdAppointments.push(a)
  }
  console.log('Agendamentos criados:', createdAppointments.length)

  // Receitas financeiras vinculadas aos atendimentos realizados
  for (const apt of createdAppointments.filter(a => a.status === 'COMPLETED')) {
    const fullApt = appointmentsData.find(a => a.clientId === apt.clientId && a.date === apt.date)
    if (!fullApt) continue
    const client = createdClients.find(c => c.id === apt.clientId)!
    const service = allServices.find(s => s.id === apt.serviceId)!
    await prisma.financial.create({
      data: {
        type: 'INCOME',
        clientId: apt.clientId,
        appointmentId: apt.id,
        paymentMethodId: apt.paymentMethodId,
        description: `${service.name} - ${client.firstName} ${client.lastName}`,
        value: apt.value,
        date: apt.date,
        category: 'Atendimento',
      },
    })
  }

  // Despesas de exemplo
  const expensesData = [
    { description: 'Base Maybelline Fit Me', value: 89.9, date: new Date(now.getFullYear(), now.getMonth(), 5), category: 'Material' },
    { description: 'Cola para cílios', value: 45.0, date: new Date(now.getFullYear(), now.getMonth(), 8), category: 'Material' },
    { description: 'Energia elétrica', value: 180.0, date: new Date(now.getFullYear(), now.getMonth(), 10), category: 'Despesas fixas' },
    { description: 'Internet', value: 99.9, date: new Date(now.getFullYear(), now.getMonth(), 10), category: 'Despesas fixas' },
    { description: 'Blush Ruby Rose', value: 35.5, date: new Date(now.getFullYear(), now.getMonth(), 12), category: 'Material' },
    { description: 'Transporte', value: 60.0, date: new Date(now.getFullYear(), now.getMonth(), 15), category: 'Transporte' },
    { description: 'Divulgação Instagram', value: 50.0, date: new Date(now.getFullYear(), now.getMonth(), 18), category: 'Marketing' },
  ]

  for (const expense of expensesData) {
    await prisma.financial.create({
      data: {
        type: 'EXPENSE',
        description: expense.description,
        value: expense.value,
        date: expense.date,
        category: expense.category,
      },
    })
  }
  console.log('Despesas criadas:', expensesData.length)

  // Itens de estoque/compras
  const inventoryData = [
    { name: 'Base Maybelline Fit Me', value: 89.9, purchaseDate: new Date(now.getFullYear(), now.getMonth(), 5), category: 'Base', notes: 'Tonalidade 220' },
    { name: 'Corretivo L\'Oréal', value: 62.0, purchaseDate: new Date(now.getFullYear(), now.getMonth() - 1, 20), category: 'Corretivo', notes: null },
    { name: 'Pó translúcido Ruby Rose', value: 28.5, purchaseDate: new Date(now.getFullYear(), now.getMonth() - 1, 20), category: 'Pó', notes: null },
    { name: 'Blush Vult', value: 35.5, purchaseDate: new Date(now.getFullYear(), now.getMonth(), 12), category: 'Blush', notes: 'Cor rosê' },
    { name: 'Cola para cílios', value: 45.0, purchaseDate: new Date(now.getFullYear(), now.getMonth(), 8), category: 'Cílios', notes: 'Marca DUO' },
    { name: 'Batom Mac Ruby Woo', value: 125.0, purchaseDate: new Date(now.getFullYear(), now.getMonth() - 2, 15), category: 'Batom', notes: null },
  ]

  for (const item of inventoryData) {
    await prisma.inventory.create({ data: item })
  }
  console.log('Itens de estoque criados:', inventoryData.length)

  console.log('\n✅ Seed concluído com sucesso!')
  console.log('\n📧 Login: admin@maquiadora.com')
  console.log('🔑 Senha: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
