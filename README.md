# Studio Pro - Sistema de Gestao para Maquiadora

Sistema web completo para gerenciamento de uma maquiadora autonoma.

## Funcionalidades

- **Dashboard**: metricas em tempo real, graficos de faturamento, agendamentos do dia
- **Clientes**: cadastro simples, busca por nome/telefone, historico completo
- **Agenda**: calendario com visualizacoes Dia / Semana / Mes
- **Financeiro**: controle de receitas e despesas com fluxo de caixa
- **Estoque**: registro de compras e historico de materiais (gera despesa automaticamente no Financeiro)
- **Relatorios**: analise de clientes, servicos e financeiro, com exportacao Excel
- **Configuracoes**: gerenciar servicos, formas de pagamento e perfil
- **Tema claro/escuro**: toggle pelo header ou configuracoes

## Como rodar

### Pre-requisitos
- Node.js 18+
- Uma conta Google e um projeto no [Firebase Console](https://console.firebase.google.com/)
- npm

### 1. Configurar o Firebase

No Firebase Console, no projeto usado por este sistema:
1. Ative **Authentication** com o provedor **Email/Senha**
2. Ative o **Firestore Database**
3. Crie ao menos um usuario em Authentication > Users (email e senha), que sera usado para logar no sistema
4. Em Configuracoes do projeto > Geral > Seus apps, copie as credenciais do app Web

### 2. Configurar o frontend

Crie o arquivo `frontend/.env.local` com as credenciais copiadas no passo anterior:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Instalar e rodar

```bash
cd frontend
npm install
npm run dev
```

O frontend estara em: http://localhost:3000

Faca login com o usuario criado no passo 1.

## Estrutura do Projeto

```
maquiagem-system/
├── frontend/                 # Next.js 14 + TypeScript + Tailwind
│   └── src/
│       ├── app/
│       │   ├── (auth)/       # Pagina de login
│       │   └── (admin)/      # Paginas protegidas (dashboard, clientes, agenda, financeiro, estoque, relatorios, configuracoes)
│       ├── components/       # Componentes reutilizaveis
│       ├── hooks/            # Custom hooks (ex: useAuth)
│       ├── lib/
│       │   ├── firebase.ts   # Inicializacao do Firebase (Auth + Firestore)
│       │   ├── firestore.ts  # Camada de acesso aos dados (substitui uma API tradicional)
│       │   └── auth.ts       # Login/logout via Firebase Auth
│       └── types/            # TypeScript types
│
├── firebase.json              # Configuracao de deploy (Firebase Hosting)
├── .firebaserc                 # Projeto Firebase associado
└── backend/                    # Legado: API Express + Prisma/PostgreSQL, nao utilizado pelo app atual
```

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Graficos | Recharts |
| Calendario | date-fns |
| Autenticacao | Firebase Authentication |
| Banco de dados | Firestore |
| Exportacao | xlsx |

## Servicos sugeridos

A tabela de servicos e gerenciada em **Configuracoes > Servicos**. Como ponto de partida, um studio de maquiagem tipicamente cadastra algo como:

| Servico | Valor |
|---------|-------|
| Em Espera | R$ 0 |
| Sem Cilios | R$ 90 |
| Com Cilios | R$ 90 |
| Infantil sem Video | R$ 50 |
| Infantil com Video | R$ 70 |
| Curso Automaquiagem | R$ 180 |
| Curso Infantil | R$ 140 |
| Curso Profissional | R$ 800 |
| Colagem de Cilios | R$ 20 |
