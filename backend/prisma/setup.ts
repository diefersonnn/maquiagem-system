/**
 * Roda em produção para criar as tabelas e o usuário admin inicial.
 * Execute: npx ts-node prisma/setup.ts
 */
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🔧 Aplicando schema no banco...')
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })

  const prisma = new PrismaClient()

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@studiomake.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminName = process.env.ADMIN_NAME || 'Administrador'

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 10)
    await prisma.user.create({
      data: { email: adminEmail, password: hashed, name: adminName },
    })
    console.log(`✅ Admin criado: ${adminEmail} / ${adminPassword}`)
  } else {
    console.log(`ℹ️  Admin já existe: ${adminEmail}`)
  }

  await prisma.$disconnect()
  console.log('✅ Setup concluído!')
}

main().catch(e => { console.error(e); process.exit(1) })
