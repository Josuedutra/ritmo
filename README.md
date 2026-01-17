# RITMO MVP

> Follow-up Inteligente para Orçamentos B2B

Cadência automática + painel + envio para follow-up de orçamentos.

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+
- pnpm 8+
- PostgreSQL (Neon ou Supabase)

### Setup Local

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com as credenciais

# 3. Gerar Prisma Client
pnpm db:generate

# 4. Aplicar migrations (dev)
pnpm db:push

# 5. Seed da base de dados
pnpm db:seed

# 6. Iniciar servidor dev
pnpm dev
```

### Aceder à Aplicação

- **App:** http://localhost:3000
- **Health:** http://localhost:3000/health
- **API Health:** http://localhost:3000/api/health

### Credenciais Demo

```
Email: admin@demo.ritmo.app
Password: demo123
```

## 📁 Estrutura do Projeto

```
ritmo-mvp/
├── prisma/
│   ├── schema.prisma     # Schema da base de dados
│   └── seed.ts           # Dados de seed
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   ├── auth/     # NextAuth endpoints
│   │   │   ├── cron/     # Cron jobs
│   │   │   ├── health/   # Health check
│   │   │   └── webhooks/ # Inbound email, Stripe
│   │   ├── dashboard/    # Dashboard page
│   │   ├── health/       # Health page
│   │   └── login/        # Login page
│   └── lib/
│       ├── auth.ts       # NextAuth config
│       ├── business-days.ts # Dias úteis + timezone
│       ├── email.ts      # Resend client
│       ├── logger.ts     # Logging estruturado
│       ├── prisma.ts     # Prisma client
│       ├── storage.ts    # Supabase Storage
│       └── stripe.ts     # Stripe client
├── docs/
│   └── PLANO_DESENVOLVIMENTO.md
└── package.json
```

## 🔑 Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret para JWT |
| `NEXTAUTH_URL` | URL base da app |
| `CRON_SECRET` | Token para proteger cron endpoints |
| `RESEND_API_KEY` | API key do Resend |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role |

## 📋 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm start` | Servidor de produção |
| `pnpm lint` | Linting |
| `pnpm format` | Formatar código |
| `pnpm db:generate` | Gerar Prisma Client |
| `pnpm db:push` | Push schema para DB |
| `pnpm db:migrate` | Criar migration |
| `pnpm db:seed` | Seed da base de dados |
| `pnpm db:studio` | Prisma Studio GUI |

## 🧪 Testar Endpoints

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Cron (requires token)

```bash
curl -X POST http://localhost:3000/api/cron/process-cadence \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Inbound Email Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/inbound-email \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","to":["bcc+demo+123@inbound.ritmo.app"],"subject":"Test"}'
```

## 📊 Sprint Status

- [x] Sprint 0: Setup & Skeleton
  - [x] Next.js 15 + TypeScript + Tailwind
  - [x] Prisma schema
  - [x] NextAuth v5
  - [x] Health endpoints
  - [x] Cron stub
  - [x] Webhook stubs
  - [x] Seed data
- [ ] Sprint 1: Core (quotes, cadence, dashboard)
- [ ] Sprint 2: Email & Billing
- [ ] Sprint 3: Inbound & UX
- [ ] Sprint 4: Hardening

## 📄 Documentação

- [Plano de Desenvolvimento](docs/PLANO_DESENVOLVIMENTO.md)

## 📝 License

Private - All rights reserved
