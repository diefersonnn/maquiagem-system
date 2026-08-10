# Blush - Sistema de Gestão para Maquiadora

Sistema web completo para gerenciamento de uma maquiadora autônoma.

## Funcionalidades

- **Dashboard**: métricas em tempo real, gráficos de faturamento, agendamentos do dia
- **Clientes**: cadastro simples, busca por nome/telefone, histórico completo
- **Agenda**: calendário com visualizações Dia / Semana / Mês
- **Financeiro**: controle de receitas e despesas com fluxo de caixa
- **Estoque**: registro de compras e histórico de materiais (gera despesa automaticamente no Financeiro)
- **Relatórios**: análise de clientes, serviços e financeiro, com exportação Excel
- **Configurações**: gerenciar serviços, formas de pagamento e perfil
- **Tema claro/escuro**: toggle pelo header ou configurações

## Como rodar

### Pré-requisitos
- Node.js 18+
- Uma conta Google e um projeto no [Firebase Console](https://console.firebase.google.com/)
- npm

### 1. Configurar o Firebase

No Firebase Console, no projeto usado por este sistema:
1. Ative **Authentication** com o provedor **Email/Senha**
2. Ative o **Firestore Database**
3. Crie ao menos um usuário em Authentication > Users (email e senha), que será usado para logar no sistema
4. Em Configurações do projeto > Geral > Seus apps, copie as credenciais do app Web

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

O frontend estará em: http://localhost:3000

Faça login com o usuário criado no passo 1.

## Estrutura do Projeto

```
maquiagem-system/
├── frontend/                 # Next.js 14 + TypeScript + Tailwind
│   └── src/
│       ├── app/
│       │   ├── (auth)/       # Página de login
│       │   └── (admin)/      # Páginas protegidas (dashboard, clientes, agenda, financeiro, estoque, relatórios, configurações)
│       ├── components/       # Componentes reutilizáveis
│       ├── hooks/            # Custom hooks (ex: useAuth)
│       ├── lib/
│       │   ├── firebase.ts   # Inicialização do Firebase (Auth + Firestore)
│       │   ├── firestore.ts  # Camada de acesso aos dados (substitui uma API tradicional)
│       │   └── auth.ts       # Login/logout via Firebase Auth
│       └── types/            # TypeScript types
│
├── firebase.json              # Configuração de deploy (Firebase Hosting)
├── .firebaserc                 # Projeto Firebase associado
└── backend/                    # Legado: API Express + Prisma/PostgreSQL, não utilizado pelo app atual
```

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Gráficos | Recharts |
| Calendário | date-fns |
| Autenticação | Firebase Authentication |
| Banco de dados | Firestore |
| Exportação | xlsx |

## Serviços sugeridos

A tabela de serviços é gerenciada em **Configurações > Serviços**. Como ponto de partida, um estúdio de maquiagem tipicamente cadastra algo como:

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
