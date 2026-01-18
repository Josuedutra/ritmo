# Arquitetura do Sistema

## 1. Stack Tecnológica

| Componente | Escolha | Justificação |
|------------|---------|--------------|
| **Frontend** | Next.js 14+ (App Router) | SSR, RSC, excelente DX. |
| **Styling** | Tailwind + shadcn/ui | Desenvolvimento rápido e consistente. |
| **Backend** | Next.js API Routes + Route Handlers | Unificado com o frontend, serverless-ready. |
| **Bases de Dados** | PostgreSQL (Neon) | Serverless Postgres com funcionalidade de branching. |
| **ORM** | Prisma | Type-safe, gestão de migrações robusta. |
| **Auth** | NextAuth.js v5 | Integração nativa e segura com Next.js. |
| **Scheduler** | Vercel Cron + Endpoint Idempotente | Solução simples sem necessidade de worker residente. |
| **Email** | Resend (MVP) → SMTP org depois | API simples e bom deliverability. |
| **Storage** | Supabase Storage | Compatível com S3, URLs assinadas. |
| **Inbound Email** | Resend Webhooks (ou Mailgun) | Parse automático de anexos. |
| **Billing** | Stripe | Subscrições e faturação baseada em uso. |
| **Timezone** | date-fns-tz + Intl | Suporte nativo para Europe/Lisbon. |

## 2. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Dashboard │ │ Quotes   │ │Templates │ │ Settings │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       └────────────┴────────────┴────────────┘              │
│                         │                                   │
│       Client/Server Components                              │
└─────────────────────────┼───────────────────────────────────┘
                          │ Call API Routes
┌─────────────────────────┼───────────────────────────────────┐
│                     BACKEND (API)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Quotes   │ │ Cadence  │ │ Email    │ │ Billing  │       │
│  │ Service  │ │ Engine   │ │ Service  │ │ Service  │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │             │            │             │            │
│       └─────────────┼────────────┼─────────────┘            │
└─────────────────────┼────────────┼──────────────────────────┘
                      │            │
┌─────────────────────┼────────────┼──────────────────────────┐
│              EXTERNAL SERVICES                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ Neon   │ │Supabase│ │ Resend │ │ Stripe │ │ Vercel │    │
│  │ (DB)   │ │Storage │ │ (Mail) │ │(Billing│ │ Cron   │    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 3. Decisões Críticas de Design

### Scheduler (Vercel Cron) com Claim Transacional
- **Problema:** Em serverless, múltiplas instâncias podem ser iniciadas pelo Cron, processando o mesmo evento duas vezes.
- **Solução:** Utilizar `UPDATE...WHERE...RETURNING` (Atomic Claim) para reservar eventos.
- **Idempotência:** Garantida pelos campos `claimed_at`, `claimed_by` e `processed_at`.

### Inbound Email (BCC)
- **Abordagem:** Resend Inbound Webhooks.
- **Fluxo:** Email enviado para `bcc+{org_id}+{quote_id}@inbound.ritmo.app` → Resend processa → POST `/api/webhooks/inbound-email`.
- **Parsing:** O sistema extrai o ID da organização e do orçamento do endereço "To", guarda anexos (PDF) no Supabase e atualiza o registo.

### Storage (Supabase)
- **Razão:** Integração simples e eficiente, com suporte nativo a URLs assinadas para segurança dos documentos.
- **Estrutura:** Bucket `proposals` com políticas de segurança (RLS) isoladas por `organization_id`.

### Billing — Regra de Contagem (v1.1)
- **Métrica:** `quotes_sent` = Contagem de orçamentos que transitaram para `business_status='sent'` no período de faturação.
- **Regras:**
    1. Primeira vez que um orçamento é enviado (`first_sent_at`): **Conta +1**.
    2. Reenvio do MESMO orçamento (incremento de `cadence_run_id`): **Conta +0**.
    3. Orçamento diferente: **Conta +1**.
- **Implementação:** O campo `quote.first_sent_at` torna-se imutável após ser definido pela primeira vez. O sistema de billing verifica registos onde `first_sent_at` está dentro do intervalo `period_start` e `period_end`.
