# 💄 Studio Pro — Sistema de Gestão para Maquiadora

Sistema web completo para gerenciamento de uma maquiadora autônoma.

## ✨ Funcionalidades

- **Dashboard** — métricas em tempo real, gráficos de faturamento, agendamentos do dia
- **Clientes** — cadastro simples, busca por nome/telefone, histórico completo
- **Agenda** — calendário com visualizações Dia / Semana / Mês
- **Financeiro** — controle de receitas e despesas com fluxo de caixa
- **Estoque** — registro de compras e histórico de materiais
- **Relatórios** — análise de clientes, serviços e financeiro + exportação Excel
- **Backup** — automático diário + manual com restauração
- **Configurações** — gerenciar serviços, formas de pagamento e perfil
- **Tema claro/escuro** — toggle pelo header ou configurações

## 🚀 Como rodar

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+ (ou Docker)
- npm ou yarn

---

### Opção 1: Docker Compose (recomendado)

```bash
docker-compose up -d
```

Acesse: http://localhost:3000

---

### Opção 2: Desenvolvimento local

#### 1. Banco de dados
```bash
# Inicie o PostgreSQL e crie o banco
createdb maquiadora
```

#### 2. Backend
```bash
cd backend
npm install

# Configure o .env (já existe um .env pronto)
# Ajuste DATABASE_URL se necessário

# Gerar o cliente Prisma e criar as tabelas
npx prisma generate
npx prisma migrate dev --name init

# Popular com dados de exemplo
npm run db:seed

# Rodar em desenvolvimento
npm run dev
```

O backend estará em: http://localhost:3001

#### 3. Frontend
```bash
cd frontend
npm install

# Rodar em desenvolvimento
npm run dev
```

O frontend estará em: http://localhost:3000

---

## 🔐 Credenciais padrão

| Campo | Valor |
|-------|-------|
| Email | admin@maquiadora.com |
| Senha | admin123 |

> ⚠️ Altere a senha após o primeiro acesso em **Configurações → Perfil**

---

## 🗂 Estrutura do Projeto

```
maquiadora-system/
├── backend/                 # API Node.js + Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma    # Schema do banco de dados
│   │   └── seed.ts          # Dados de exemplo
│   ├── src/
│   │   ├── middleware/      # Autenticação JWT
│   │   ├── routes/          # Rotas da API
│   │   └── index.ts         # Servidor principal
│   └── backups/             # Arquivos de backup
│
├── frontend/                # Next.js 14 + TypeScript + Tailwind
│   └── src/
│       ├── app/
│       │   ├── (auth)/      # Página de login
│       │   └── (admin)/     # Páginas protegidas
│       ├── components/      # Componentes reutilizáveis
│       ├── hooks/           # Custom hooks
│       ├── lib/             # Utilitários e API client
│       └── types/           # TypeScript types
│
└── docker-compose.yml       # Orquestração dos serviços
```

---

## 🛠 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Gráficos | Recharts |
| Calendário | date-fns |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Banco de dados | PostgreSQL |
| Autenticação | JWT (bcryptjs) |
| Exportação | xlsx |
| Backup | Automático via node-cron |

---

## 📦 Serviços padrão cadastrados

| Serviço | Valor |
|---------|-------|
| Em Espera | R$ 0 |
| Sem Cílios | R$ 90 |
| Com Cílios | R$ 90 |
| Infantil sem Vídeo | R$ 50 |
| Infantil com Vídeo | R$ 70 |
| Curso Automaquiagem | R$ 180 |
| Curso Infantil | R$ 140 |
| Curso Profissional | R$ 800 |
| Colagem de Cílios | R$ 20 |

> Todos os valores podem ser alterados em **Configurações → Serviços**

---

## 🔄 Comandos úteis do Backend

```bash
# Ver banco de dados visualmente
npm run db:studio

# Resetar banco e recriar dados de exemplo
npm run db:reset

# Criar nova migration
npx prisma migrate dev --name nome_da_migration
```
