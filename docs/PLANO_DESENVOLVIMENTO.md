# RITMO MVP — Plano de Desenvolvimento Técnico

> **Versão:** 1.1 | **Data:** 2026-01-17 | **Autor:** Tech Lead

---

## Changelog v1.1

| # | Alteração | Impacto |
|---|-----------|---------|
| 1 | `contacts.email` agora NULLABLE | Schema, validações |
| 2 | Separação `business_status` vs `ritmo_stage` | Schema, API, UI |
| 3 | Cron com claim transacional (`UPDATE...RETURNING`) | Cron flow, concorrência |
| 4 | Enum `cadence_event.status` inclui `skipped` | Schema, lógica |
| 5 | Regra exacta de contagem `quotes_sent` para billing | Billing, contadores |
| 6 | Call Card D+7: CTA "Adicionar proposta" se vazio | UX, frontend |

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Modelo de Dados](#3-modelo-de-dados)
4. [Endpoints API](#4-endpoints-api)
5. [Fluxos Principais](#5-fluxos-principais)
6. [UX/Frontend](#6-uxfrontend)
7. [Roadmap Sprints](#7-roadmap-sprints)
8. [Testes](#8-testes)
9. [Estimativas e Riscos](#9-estimativas-e-riscos)
10. [Shortcuts Cursor](#10-shortcuts-cursor)

---

## 1. Visão Geral

### 1.1 Objetivo do Produto

O **RITMO** é um SaaS de "cadência + painel + envio" para follow-up de orçamentos B2B. Não substitui CRM — controla estado, próxima ação e dispara follow-ups automáticos.

### 1.2 Cadência (SLA) — Dias Úteis

| Evento | Tipo | Prioridade | Descrição |
|--------|------|------------|-----------|
| D+1 | Email (T2) | — | Follow-up inicial |
| D+3 | Email (T3) | — | Segundo follow-up |
| D+7 | Tarefa Chamada | HIGH/LOW | Chamada (valor ≥1000€ = HIGH) |
| D+14 | Email (T5) | — | Fecho suave |

### 1.3 Regras Anti-Robô

- Máx. 1 email/orçamento a cada 48h
- Janela envio: 09:00–18:00 Europe/Lisbon
- Parar cadência se `business_status` → Ganho/Perdido
- Opt-out global por organização
- Logging completo

### 1.4 Modelo de Estados (v1.1)

```
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS STATUS                          │
│  (Estado comercial real do orçamento)                       │
│                                                             │
│  draft → sent → negotiation → won | lost                    │
│    │                  │                                     │
│    └──────────────────┴──── Controlado pelo utilizador      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     RITMO STAGE                             │
│  (Fase do follow-up automático)                             │
│                                                             │
│  idle → fup_d1 → fup_d3 → fup_d7 → fup_d14 → completed     │
│    │                                              │         │
│    └──────────────── paused ◄─────────────────────┘         │
│                         │                                   │
│                      stopped (se won/lost)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura

### 2.1 Stack Escolhida (Decisão Final)

| Componente | Escolha | Justificação |
|------------|---------|--------------|
| **Frontend** | Next.js 14+ (App Router) | SSR, RSC, excelente DX |
| **Styling** | Tailwind + shadcn/ui | Rápido, consistente |
| **Backend** | Next.js API Routes + Route Handlers | Unificado, serverless-ready |
| **DB** | PostgreSQL (Neon) | Serverless Postgres, branching |
| **ORM** | Prisma | Type-safe, migrations |
| **Auth** | NextAuth.js v5 | Integração nativa Next.js |
| **Scheduler** | Vercel Cron + endpoint idempotente | Sem worker residente |
| **Email** | Resend (MVP) → SMTP org depois | API simples, bom deliverability |
| **Storage** | Supabase Storage | S3-compatible, URLs assinadas |
| **Inbound Email** | Resend Webhooks (ou Mailgun) | Parse automático de anexos |
| **Billing** | Stripe | Subscriptions + usage-based |
| **Timezone** | date-fns-tz + Intl | Europe/Lisbon nativo |

### 2.2 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Dashboard │ │ Quotes   │ │Templates │ │ Settings │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       └────────────┴────────────┴────────────┘              │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │ API Routes
┌─────────────────────────┼───────────────────────────────────┐
│                     BACKEND (API)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Quotes   │ │ Cadence  │ │ Email    │ │ Billing  │       │
│  │ Service  │ │ Engine   │ │ Service  │ │ Service  │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       └────────────┴────────────┴────────────┘              │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│              EXTERNAL SERVICES                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ Neon   │ │Supabase│ │ Resend │ │ Stripe │ │ Vercel │    │
│  │ (DB)   │ │Storage │ │ (Mail) │ │(Billing│ │ Cron   │    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Justificações Críticas

#### Scheduler (Vercel Cron) com Claim Transacional

- **Problema:** Múltiplas instâncias podem processar o mesmo evento
- **Solução:** `UPDATE...WHERE...RETURNING` atómico para "claim"
- **Idempotência:** Campo `claimed_at` + `claimed_by` + `processed_at`

#### Inbound Email (BCC)

- **Abordagem:** Resend Inbound Webhooks
- **Flow:** Email → Resend → POST `/api/webhooks/inbound-email`
- **Parse:** Extrair `To:` para obter `{org_id}+{quote_id}`, guardar anexo PDF

#### Storage (Supabase)

- **Razão:** Integração simples, URLs assinadas nativas
- **Bucket:** `proposals` com policy por organization_id

#### Billing — Regra de Contagem (v1.1)

```
quotes_sent = COUNT de quotes que transitaram para business_status='sent'
            no período de faturação atual

Regras:
- Primeira vez que quote passa para 'sent': +1
- Reenvio (novo cadence_run_id) do MESMO quote: +0 (não conta extra)
- Quote diferente: +1

Implementação:
- Campo quote.first_sent_at (imutável após primeiro set)
- Billing conta quotes WHERE first_sent_at BETWEEN period_start AND period_end
```

---

## 3. Modelo de Dados

### 3.1 Diagrama ERD Simplificado

```
organizations (1) ──< users (N)
      │
      ├──< contacts (N)
      │         │
      ├──< quotes (N) ──< cadence_events (N)
      │         │              │
      │         └──────< tasks (N)
      │
      ├──< templates (N)
      ├──< suppression_global (N)
      ├──< subscriptions (1)
      └──< inbound_ingestions (N)
```

### 3.2 Enums (v1.1)

```sql
-- Estado comercial do orçamento
CREATE TYPE business_status AS ENUM (
  'draft',        -- Rascunho
  'sent',         -- Enviado ao cliente
  'negotiation',  -- Em negociação
  'won',          -- Ganho
  'lost'          -- Perdido
);

-- Fase do follow-up Ritmo
CREATE TYPE ritmo_stage AS ENUM (
  'idle',         -- Sem cadência activa
  'fup_d1',       -- Aguarda/processou D+1
  'fup_d3',       -- Aguarda/processou D+3
  'fup_d7',       -- Aguarda/processou D+7 (chamada)
  'fup_d14',      -- Aguarda/processou D+14
  'completed',    -- Cadência completa
  'paused',       -- Pausado manualmente
  'stopped'       -- Parado (won/lost)
);

-- Status de cada evento da cadência
CREATE TYPE cadence_event_status AS ENUM (
  'scheduled',    -- Agendado, ainda não chegou a hora
  'claimed',      -- Reservado por worker (em processamento)
  'sent',         -- Email enviado com sucesso
  'completed',    -- Tarefa completada (para calls)
  'skipped',      -- Saltado (suppression, sem email, etc.)
  'cancelled',    -- Cancelado (status mudou, reenvio)
  'deferred',     -- Adiado (fora da janela, 48h rule)
  'failed'        -- Falhou (erro técnico)
);

-- Prioridade da chamada
CREATE TYPE call_priority AS ENUM ('HIGH', 'LOW');
```

### 3.3 Tabelas Detalhadas

#### `organizations`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(255) NOT NULL
slug            VARCHAR(100) UNIQUE NOT NULL
timezone        VARCHAR(50) DEFAULT 'Europe/Lisbon'
value_threshold DECIMAL(10,2) DEFAULT 1000.00
send_window_start TIME DEFAULT '09:00'
send_window_end   TIME DEFAULT '18:00'
email_cooldown_hours INT DEFAULT 48
bcc_address     VARCHAR(255) UNIQUE  -- bcc+{org_id}@inbound.ritmo.app
smtp_host       VARCHAR(255)
smtp_port       INT
smtp_user       VARCHAR(255)
smtp_pass_encrypted TEXT
smtp_from       VARCHAR(255)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `users`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
email           VARCHAR(255) NOT NULL
name            VARCHAR(255)
password_hash   TEXT
role            VARCHAR(20) DEFAULT 'member'  -- admin | member
email_verified  BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(organization_id, email)
```

#### `contacts` (v1.1 — email NULLABLE)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
email           VARCHAR(255)  -- NULLABLE: contacto pode não ter email
name            VARCHAR(255)
company         VARCHAR(255)
phone           VARCHAR(50)
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

-- Índice parcial para unicidade onde email existe
CREATE UNIQUE INDEX idx_contacts_org_email 
  ON contacts(organization_id, email) 
  WHERE email IS NOT NULL;
```

#### `quotes` (v1.1 — business_status + ritmo_stage)
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE
contact_id        UUID REFERENCES contacts(id)
cadence_run_id    INT DEFAULT 0  -- Incrementa a cada reenvio (0 = nunca enviado)
reference         VARCHAR(100)
title             VARCHAR(255) NOT NULL
service_type      VARCHAR(100)
value             DECIMAL(12,2)
currency          VARCHAR(3) DEFAULT 'EUR'

-- v1.1: Separação de estados
business_status   business_status DEFAULT 'draft'
ritmo_stage       ritmo_stage DEFAULT 'idle'

sent_at           TIMESTAMPTZ    -- Data do último envio
first_sent_at     TIMESTAMPTZ    -- Data do PRIMEIRO envio (imutável, para billing)
valid_until       DATE
proposal_link     TEXT
proposal_file_id  UUID REFERENCES attachments(id)
notes             TEXT
last_activity_at  TIMESTAMPTZ
created_by        UUID REFERENCES users(id)
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()

INDEX idx_quotes_org_status (organization_id, business_status)
INDEX idx_quotes_org_stage (organization_id, ritmo_stage)
INDEX idx_quotes_first_sent (organization_id, first_sent_at)
```

#### `cadence_events` (v1.1 — claim transacional)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
quote_id        UUID REFERENCES quotes(id) ON DELETE CASCADE
cadence_run_id  INT NOT NULL
event_type      VARCHAR(20) NOT NULL  -- email_d1 | email_d3 | call_d7 | email_d14
scheduled_for   TIMESTAMPTZ NOT NULL
status          cadence_event_status DEFAULT 'scheduled'
priority        call_priority  -- Apenas para call_d7
skip_reason     VARCHAR(100)   -- Se status=skipped: 'no_email' | 'suppressed' | 'manual'
cancel_reason   VARCHAR(100)   -- Se status=cancelled: 'status_changed' | 'resent' | 'manual'

-- v1.1: Campos para claim transacional
claimed_at      TIMESTAMPTZ    -- Quando foi reservado
claimed_by      VARCHAR(100)   -- ID do worker/instância
processed_at    TIMESTAMPTZ    -- Quando foi processado
error_message   TEXT

created_at      TIMESTAMPTZ DEFAULT NOW()

UNIQUE(quote_id, cadence_run_id, event_type)
INDEX idx_events_pending (organization_id, status, scheduled_for)
INDEX idx_events_claim (status, scheduled_for, claimed_at)
```

#### `tasks`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
quote_id        UUID REFERENCES quotes(id) ON DELETE CASCADE
cadence_event_id UUID REFERENCES cadence_events(id)
type            VARCHAR(20) NOT NULL  -- call | follow_up | custom
title           VARCHAR(255) NOT NULL
description     TEXT
due_at          TIMESTAMPTZ
priority        call_priority DEFAULT 'LOW'
status          VARCHAR(20) DEFAULT 'pending'  -- pending | completed | skipped
assigned_to     UUID REFERENCES users(id)
completed_at    TIMESTAMPTZ
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

INDEX idx_tasks_due (organization_id, status, due_at)
```

#### `email_logs`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
quote_id        UUID REFERENCES quotes(id)
cadence_event_id UUID REFERENCES cadence_events(id)
template_id     UUID REFERENCES templates(id)
to_email        VARCHAR(255) NOT NULL
subject         VARCHAR(500)
provider        VARCHAR(50)  -- resend | smtp | manual
provider_message_id VARCHAR(255)
status          VARCHAR(20)  -- queued | sent | delivered | bounced | failed
sent_at         TIMESTAMPTZ
error_message   TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()

INDEX idx_email_logs_quote (quote_id, created_at)
```

#### `templates`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
code            VARCHAR(50) NOT NULL  -- T2 | T3 | T5 | CALL_SCRIPT
name            VARCHAR(255) NOT NULL
subject         VARCHAR(500)
body            TEXT NOT NULL
variables       JSONB  -- [{name, default}]
is_active       BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

UNIQUE(organization_id, code)
```

#### `suppression_global`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
email           VARCHAR(255) NOT NULL
reason          VARCHAR(50)  -- opt_out | bounce | complaint
created_at      TIMESTAMPTZ DEFAULT NOW()

UNIQUE(organization_id, email)
```

#### `subscriptions`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id     UUID UNIQUE REFERENCES organizations(id)
stripe_customer_id  VARCHAR(255)
stripe_subscription_id VARCHAR(255)
plan_id             VARCHAR(50)  -- free | starter | pro | enterprise
status              VARCHAR(20)  -- active | past_due | cancelled | trialing
quotes_limit        INT  -- Limite mensal
current_period_start TIMESTAMPTZ
current_period_end   TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

#### `usage_counters`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
period_start    DATE NOT NULL
period_end      DATE NOT NULL
quotes_sent     INT DEFAULT 0  -- Conta first_sent_at (não reenvios)
emails_sent     INT DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

UNIQUE(organization_id, period_start)
```

#### `attachments`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
filename        VARCHAR(255) NOT NULL
content_type    VARCHAR(100)
size_bytes      BIGINT
storage_path    TEXT NOT NULL
uploaded_by     UUID REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `inbound_ingestions`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID REFERENCES organizations(id)
quote_id        UUID REFERENCES quotes(id)
raw_from        VARCHAR(255)
raw_to          VARCHAR(255)
raw_subject     VARCHAR(500)
raw_body_text   TEXT
parsed_link     TEXT
attachment_id   UUID REFERENCES attachments(id)
status          VARCHAR(20)  -- pending | processed | failed | unmatched
error_message   TEXT
processed_at    TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

---

## 4. Endpoints API

### 4.1 Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registo org + admin |
| POST | `/api/auth/login` | Login (NextAuth) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/session` | Sessão atual |

### 4.2 Quotes (Orçamentos) — v1.1

```typescript
// POST /api/quotes
{
  "contact_id": "uuid",
  "title": "Manutenção AVAC Anual",
  "service_type": "Manutenção",
  "value": 2500.00,
  "valid_until": "2026-02-15"
}
// → Cria com business_status='draft', ritmo_stage='idle'

// PATCH /api/quotes/:id/send
{
  "sent_at": "2026-01-17T10:00:00Z"  // opcional, default=now
}
// → Lógica:
//   1. Se first_sent_at IS NULL: set first_sent_at = now, incrementa usage_counter
//   2. Incrementa cadence_run_id
//   3. Cancela eventos anteriores (status='cancelled', cancel_reason='resent')
//   4. business_status = 'sent'
//   5. ritmo_stage = 'fup_d1'
//   6. Gera 4 cadence_events (D+1, D+3, D+7, D+14)

// PATCH /api/quotes/:id/status
{
  "business_status": "negotiation"  // ou "won" ou "lost"
}
// → Se won/lost: ritmo_stage = 'stopped', cancela eventos pendentes

// PATCH /api/quotes/:id/pause
// → ritmo_stage = 'paused', eventos pendentes ficam 'deferred'

// PATCH /api/quotes/:id/resume
// → ritmo_stage = próximo stage pendente, reagendar eventos

// GET /api/quotes?business_status=sent&ritmo_stage=fup_d7&page=1
// GET /api/quotes/:id
// DELETE /api/quotes/:id
```

### 4.3 Proposta (Link/Upload)

```typescript
// PATCH /api/quotes/:id/proposal-link
{ "proposal_link": "https://drive.google.com/..." }

// POST /api/quotes/:id/proposal-upload
// Content-Type: multipart/form-data
// file: proposal.pdf

// GET /api/quotes/:id/proposal-download
// → Redirect para URL assinada (expira em 1h)

// GET /api/quotes/:id/bcc-address
// → { "bcc": "bcc+{org_id}+{quote_id}@inbound.ritmo.app" }
```

### 4.4 Dashboard / Ações

```typescript
// GET /api/dashboard/actions-today
{
  "emails": [
    {
      "event_id": "uuid",
      "quote_id": "uuid",
      "event_type": "email_d1",
      "contact": { "name": "João", "email": "joao@empresa.pt" },
      "quote": { "title": "AVAC", "value": 800 }
    }
  ],
  "calls": [
    {
      "task_id": "uuid",
      "quote_id": "uuid",
      "priority": "HIGH",
      "contact": { "name": "Maria", "company": "TechCorp", "phone": "+351..." },
      "quote": { "title": "Solar", "value": 4500, "sent_at": "..." },
      "has_proposal": true,  // proposal_link OR proposal_file_id
      "last_followup": { "type": "email_d3", "sent_at": "..." }
    }
  ]
}

// GET /api/dashboard/pending-responses
// GET /api/dashboard/stats
```

### 4.5 Templates

```typescript
// GET /api/templates
// POST /api/templates
// PATCH /api/templates/:id
// DELETE /api/templates/:id
```

### 4.6 Cron / Scheduler (v1.1 — Claim)

```typescript
// POST /api/cron/process-cadence
// Headers: Authorization: Bearer {CRON_SECRET}
// Body: { "worker_id": "vercel-xxx-123" }  // opcional

// Resposta:
{
  "processed": 12,
  "sent": 8,
  "skipped": 2,
  "deferred": 2,
  "failed": 0,
  "duration_ms": 2340
}
```

### 4.7 Inbound Email Webhook

```typescript
// POST /api/webhooks/inbound-email
// Payload do Resend/Mailgun
{
  "from": "cliente@empresa.pt",
  "to": ["bcc+org123+quote456@inbound.ritmo.app"],
  "subject": "RE: Orçamento AVAC",
  "text": "Segue em anexo...",
  "attachments": [{ "filename": "proposta.pdf", "content": "base64..." }]
}
```

### 4.8 Settings & Billing

```typescript
// GET /api/settings/organization
// PATCH /api/settings/organization

// POST /api/billing/create-checkout
{ "plan_id": "pro" }

// GET /api/billing/usage
{
  "period": { "start": "2026-01-01", "end": "2026-01-31" },
  "quotes_sent": 42,
  "quotes_limit": 50,
  "emails_sent": 156,
  "percentage_used": 84
}

// POST /api/webhooks/stripe
```

---

## 5. Fluxos Principais

### 5.1 Criar Quote → Enviar → Gerar Cadência

```
1. User cria Quote (draft)
2. User associa proposta (link OU upload OU aguarda BCC)
3. User chama PATCH /api/quotes/:id/send
   └─> API:
       a) Se first_sent_at IS NULL:
          - first_sent_at = NOW() (Europe/Lisbon)
          - Incrementa usage_counters.quotes_sent para período atual
       b) sent_at = NOW()
       c) Incrementa cadence_run_id (+1)
       d) Se cadence_run_id > 1:
          - UPDATE cadence_events SET status='cancelled', cancel_reason='resent'
            WHERE quote_id=X AND cadence_run_id < novo
       e) business_status = 'sent'
       f) ritmo_stage = 'fup_d1'
       g) Calcula D+1, D+3, D+7, D+14 em DIAS ÚTEIS
       h) Aplica regra A/B: valor >= threshold → priority=HIGH
       i) Insere 4 cadence_events com scheduled_for
       j) Cria task para call_d7
```

### 5.2 Cron com Claim Transacional (v1.1)

```
1. Vercel Cron chama POST /api/cron/process-cadence
   - Gera worker_id único (ex: crypto.randomUUID())

2. CLAIM atómico (batch de 20):
   ```sql
   UPDATE cadence_events
   SET 
     status = 'claimed',
     claimed_at = NOW(),
     claimed_by = $worker_id
   WHERE id IN (
     SELECT id FROM cadence_events
     WHERE status = 'scheduled'
       AND scheduled_for <= NOW()
       AND claimed_at IS NULL
     ORDER BY scheduled_for
     LIMIT 20
     FOR UPDATE SKIP LOCKED
   )
   RETURNING *;
   ```

3. Para cada evento claimed:
   a) Verificar se agora está dentro da janela 09:00-18:00 Lisbon
      └─ Se não: 
         UPDATE status='deferred', scheduled_for=próximo dia útil 09:00
         CONTINUE
   
   b) Verificar 48h desde último email do quote:
      ```sql
      SELECT MAX(sent_at) FROM email_logs 
      WHERE quote_id = $quote_id AND status = 'sent'
      ```
      └─ Se <48h: defer para last_sent + 48h
         CONTINUE
   
   c) Se event_type é email_*:
      - Verificar contact.email IS NOT NULL
        └─ Se NULL: status='skipped', skip_reason='no_email', CONTINUE
      - Verificar suppression_global
        └─ Se exists: status='skipped', skip_reason='suppressed', CONTINUE
   
   d) Verificar business_status do quote:
      └─ Se 'won' ou 'lost': status='cancelled', cancel_reason='status_changed'
         CONTINUE
   
   e) PROCESSAR:
      - Se email: enviar via Resend/SMTP, criar email_log
      - Se call: criar/atualizar task
   
   f) FINALIZAR:
      UPDATE cadence_events 
      SET status='sent', processed_at=NOW()
      WHERE id = $event_id;
      
      UPDATE quotes
      SET last_activity_at=NOW(), ritmo_stage=próximo_stage
      WHERE id = $quote_id;

4. CLEANUP de claims órfãos (timeout 5 min):
   ```sql
   UPDATE cadence_events
   SET status = 'scheduled', claimed_at = NULL, claimed_by = NULL
   WHERE status = 'claimed'
     AND claimed_at < NOW() - INTERVAL '5 minutes';
   ```
```

### 5.3 Call Card D+7 (v1.1 — CTA Proposta)

```
1. Dashboard mostra task do tipo 'call' com due_at = hoje

2. Card exibe:
   - Cliente: {contact.name} @ {contact.company}
   - Valor: €{quote.value} · Prioridade: HIGH/LOW badge
   - Enviado: {quote.sent_at}
   - Último FUP: D+3 enviado ✓ (ou "Nenhum ainda")
   
3. PROPOSTA:
   SE quote.proposal_link OU quote.proposal_file_id:
     [📎 Abrir Proposta] → abre link ou download
   SENÃO:
     ┌─────────────────────────────────────────┐
     │ ⚠️ Proposta não anexada                 │
     │                                         │
     │ Adicione a proposta para a chamada:    │
     │ [🔗 Colar Link] [📤 Upload] [📧 BCC]   │
     └─────────────────────────────────────────┘

4. Outras ações:
   - [📞 Ligar] → tel:{contact.phone}
   - [📋 Copiar Resumo] → clipboard com script
   - Campo nota 1-linha
   - [✓ Completar] [⏭ Saltar]
```

### 5.4 Inbound BCC → Associar Proposta

```
1. User envia email pelo Outlook com BCC: bcc+{org}+{quote}@inbound.ritmo.app
2. Resend recebe → POST /api/webhooks/inbound-email
3. API parse:
   a) Extrai org_id e quote_id do endereço To (regex)
   b) Valida que quote existe e pertence a org
   c) Se tem anexo PDF:
      - Upload para Supabase Storage
      - Cria attachment record
      - Atualiza quote.proposal_file_id
   d) Se tem link no body (regex https?://...):
      - Atualiza quote.proposal_link
   e) Cria inbound_ingestion log (status='processed')
4. Quote card agora mostra "Proposta anexada ✓"
```

### 5.5 Reenviar Orçamento

```
1. User abre quote com business_status "sent" ou "negotiation"
2. Clica "Reenviar Orçamento"
3. Chama PATCH /api/quotes/:id/send
4. API (ver 5.1):
   - NÃO incrementa usage_counters (first_sent_at já existe)
   - Incrementa cadence_run_id
   - Cancela eventos antigos
   - Gera nova cadência
5. Dashboard mostra nova cadência activa
```

### 5.6 Mudança de Status → Parar Cadência

```
1. User muda business_status para "won" ou "lost"
2. API:
   a) business_status = 'won' (ou 'lost')
   b) ritmo_stage = 'stopped'
   c) UPDATE cadence_events 
      SET status='cancelled', cancel_reason='status_changed'
      WHERE quote_id=X AND status IN ('scheduled', 'claimed', 'deferred')
   d) UPDATE tasks SET status='skipped'
      WHERE quote_id=X AND status='pending'
```

---

## 6. UX/Frontend

### 6.1 Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Login | `/login` | Email + password |
| Dashboard | `/` | Cards de ações, stats |
| Quotes | `/quotes` | Lista + filtros + search |
| Quote Detail | `/quotes/[id]` | Timeline + ações |
| Templates | `/templates` | CRUD templates |
| Settings | `/settings` | Org config, SMTP |
| Billing | `/settings/billing` | Plano, usage, upgrade |

### 6.2 Dashboard — Cards Ricos (v1.1)

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Hoje: 3 emails · 2 chamadas · €12,500 em pipeline        │
│ 📈 Utilização: 42/50 orçamentos (84%)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ 📧 Email D+1            │  │ 📧 Email D+3            │  │
│  │ Cliente ABC             │  │ Empresa XYZ             │  │
│  │ AVAC - €800             │  │ Elétrica - €2,100       │  │
│  │ Stage: fup_d1           │  │ Stage: fup_d3           │  │
│  │ [Enviar] [Ver] [Saltar] │  │ [Enviar] [Ver] [Saltar] │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📞 CHAMADA D+7                            🔴 HIGH     │ │
│  │ João Silva @ TechCorp                                 │ │
│  │ Instalação Solar · €4,500 · Enviado: 10/Jan          │ │
│  │ Último FUP: D+3 ✓ · Tel: +351 912 345 678            │ │
│  │ Stage: fup_d7                                         │ │
│  │                                                       │ │
│  │ ⚠️ Proposta não anexada                               │ │
│  │ [🔗 Colar Link] [📤 Upload PDF] [📧 Copiar BCC]      │ │
│  │                                                       │ │
│  │ [📞 Ligar] [📋 Copiar Script] [✓ Feito] [⏭ Saltar]  │ │
│  │ Nota: ___________________________________________     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Quote Detail — Timeline com Stages

```
┌─────────────────────────────────────────────────────────────┐
│ ORC-2026-042 · Manutenção AVAC                              │
│ TechCorp · João Silva · €4,500                              │
├────────────────────────┬────────────────────────────────────┤
│ Business: SENT         │ Ritmo: fup_d7                      │
├────────────────────────┴────────────────────────────────────┤
│ Proposta: ⚠️ Não anexada                                    │
│ [🔗 Adicionar Link] [📤 Upload PDF] [📧 Copiar BCC]        │
├─────────────────────────────────────────────────────────────┤
│ Timeline (run #2):                                          │
│ ● 17 Jan - Orçamento enviado                                │
│ ● 18 Jan - Email D+1 enviado ✓                              │
│ ● 22 Jan - Email D+3 enviado ✓                              │
│ ◐ 28 Jan - Chamada D+7 (HOJE)                               │
│ ○ 04 Fev - Email D+14 agendado                              │
├─────────────────────────────────────────────────────────────┤
│ Histórico anterior (run #1 - cancelado):                    │
│ ✗ Cancelado por reenvio em 17 Jan                           │
├─────────────────────────────────────────────────────────────┤
│ [Em Negociação] [Ganho 🎉] [Perdido] [Reenviar] [Pausar]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Roadmap Sprints (30 Dias) — v1.1

### Sprint 0: Setup (Dias 1-2)

- [ ] Criar repo monorepo (Next.js 14)
- [ ] Configurar Neon DB + Prisma
- [ ] Setup NextAuth.js v5
- [ ] Deploy inicial Vercel
- [ ] Configurar Stripe (test mode)
- [ ] Configurar Resend (sandbox)
- [ ] Configurar Vercel Cron (test)

### Sprint 1: Core (Dias 3-10)

- [ ] Schema Prisma completo (v1.1 com enums)
- [ ] Migrations + seed data
- [ ] CRUD Organizations/Users
- [ ] CRUD Contacts (email nullable)
- [ ] CRUD Quotes (business_status + ritmo_stage)
- [ ] Lógica `addBusinessDays` (Europe/Lisbon, feriados PT)
- [ ] Endpoint `/api/quotes/:id/send` → gerar cadência
- [ ] **Cron idempotente com claim** (`UPDATE...RETURNING`)
- [ ] Lógica defer (janela, 48h)
- [ ] Lógica skip (no_email, suppressed)
- [ ] Tasks (criar, listar, completar, skip)
- [ ] Dashboard básico (lista ações, stats)
- [ ] Modo TASK-EMAIL (copiar template)

**Dependências:** Sprint 0 completo

### Sprint 2: Email & Billing (Dias 11-18)

- [ ] Templates CRUD + variáveis
- [ ] Integração Resend (envio real)
- [ ] email_logs completos
- [ ] Suppressions (opt-out link + webhook)
- [ ] SMTP por organização (opcional)
- [ ] **Billing: regra quotes_sent (first_sent_at)**
- [ ] Stripe Checkout + webhooks
- [ ] Página billing (plano, usage meter, upgrade)
- [ ] Limite enforcement (bloquear se quota)
- [ ] Widget usage no dashboard

**Dependências:** Sprint 1 completo

### Sprint 3: Inbound & UX (Dias 19-26)

- [ ] Supabase Storage setup
- [ ] Upload proposta (drag & drop)
- [ ] Download com URL assinada
- [ ] Inbound email webhook (Resend)
- [ ] Parser BCC → associar ao quote
- [ ] Endpoint gerar/copiar BCC address
- [ ] **Call Card rico com CTA proposta**
- [ ] Quote detail com timeline
- [ ] Copiar script/resumo para chamada
- [ ] Reenviar orçamento (nova cadence_run)
- [ ] Histórico de runs anteriores
- [ ] Polish UX (loading states, toasts, empty states)

**Dependências:** Sprint 2 completo

### Sprint 4: Hardening (Dias 27-30)

- [ ] Testes unitários (dias úteis, claim, billing)
- [ ] Testes integração (API endpoints)
- [ ] Teste E2E (Playwright: fluxo completo)
- [ ] Seed data para demo
- [ ] Documentação API (OpenAPI)
- [ ] Onboarding flow básico
- [ ] Métricas básicas (conversion rate)
- [ ] 3 pilotos (beta testers)

**Dependências:** Sprint 3 completo

---

## 8. Testes

### 8.1 Checklist Obrigatório (v1.1)

| Categoria | Teste | Prioridade |
|-----------|-------|------------|
| **Dias Úteis** | D+1 de sexta = segunda | CRÍTICO |
| **Dias Úteis** | Feriados PT excluídos | CRÍTICO |
| **Timezone** | sent_at em Lisbon (não UTC) | CRÍTICO |
| **Claim** | 2 workers não processam mesmo evento | CRÍTICO |
| **Claim** | Claim órfão é libertado após 5 min | ALTO |
| **Idempotência** | Cron 2x não duplica envios | CRÍTICO |
| **Janela Envio** | Email às 20h → defer 09:00 | ALTO |
| **48h Rule** | 2 emails em 24h → defer 2º | ALTO |
| **Skip** | Contact sem email → status=skipped | ALTO |
| **Skip** | Email suprimido → status=skipped | ALTO |
| **Cancel** | Status won/lost → cancela eventos | CRÍTICO |
| **Inbound** | Parse PDF anexo correto | MÉDIO |
| **Inbound** | Parse link do body | MÉDIO |
| **Reenviar** | Cadence antiga cancelada com reason | ALTO |
| **Reenviar** | Nova cadência correcta | ALTO |
| **Billing** | Primeiro envio → +1 quota | CRÍTICO |
| **Billing** | Reenvio → +0 quota | CRÍTICO |
| **Billing** | Quota atingida → bloqueia | ALTO |
| **Stages** | ritmo_stage avança correctamente | ALTO |

### 8.2 Estrutura de Testes

```
tests/
├── unit/
│   ├── addBusinessDays.test.ts
│   ├── cadenceGenerator.test.ts
│   ├── emailCooldown.test.ts
│   ├── claimLogic.test.ts
│   ├── billingCounter.test.ts
│   └── parseInboundEmail.test.ts
├── integration/
│   ├── quotes.api.test.ts
│   ├── cadence.api.test.ts
│   ├── cron-claim.api.test.ts
│   └── billing.api.test.ts
└── e2e/
    ├── quote-lifecycle.spec.ts
    ├── dashboard-actions.spec.ts
    ├── call-card-proposal.spec.ts
    └── inbound-email.spec.ts
```

---

## 9. Estimativas e Riscos

### 9.1 Estimativa de Esforço

| Sprint | Esforço | Complexidade | Notas v1.1 |
|--------|---------|--------------|------------|
| Sprint 0 | 2 dias | Baixa | — |
| Sprint 1 | 8 dias | Alta | +claim transacional |
| Sprint 2 | 8 dias | Média-Alta | +regra billing exacta |
| Sprint 3 | 8 dias | Média | +CTA proposta |
| Sprint 4 | 4 dias | Média | +testes claim |
| **Total** | **30 dias** | — | — |

### 9.2 Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Race condition no claim | Baixa | Alto | `FOR UPDATE SKIP LOCKED` testado |
| Cron timeout (>10s) | Média | Alto | Batch 20, claim timeout 5min |
| Claim órfão não libertado | Baixa | Médio | Cleanup no início do cron |
| Contact sem email não tratado | Média | Médio | Validação + skip_reason |
| Deliverability emails | Média | Alto | Resend domínio verificado |
| Inbound parse falha | Baixa | Médio | Fallback manual, logs |
| Billing contagem errada | Média | Alto | Testes unitários, first_sent_at |
| Stripe webhook perdido | Baixa | Alto | Idempotency keys |
| Feriados PT incorretos | Média | Médio | Lib date-holidays |

---

## 10. Shortcuts Cursor

### 10.1 Scaffolding Rápido

```bash
# Criar projeto
npx -y create-next-app@latest ritmo-mvp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Dependências core
pnpm add @prisma/client next-auth@beta @auth/prisma-adapter
pnpm add -D prisma

# UI
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input label table dialog toast badge tabs

# Utilities
pnpm add date-fns date-fns-tz zod react-hook-form @hookform/resolvers
pnpm add date-holidays  # Para feriados PT

# Email & Storage
pnpm add resend @supabase/supabase-js

# Billing
pnpm add stripe @stripe/stripe-js
```

### 10.2 Prisma Schema Snippet (v1.1)

```prisma
// prisma/schema.prisma

enum BusinessStatus {
  draft
  sent
  negotiation
  won
  lost
}

enum RitmoStage {
  idle
  fup_d1
  fup_d3
  fup_d7
  fup_d14
  completed
  paused
  stopped
}

enum CadenceEventStatus {
  scheduled
  claimed
  sent
  completed
  skipped
  cancelled
  deferred
  failed
}

enum CallPriority {
  HIGH
  LOW
}

model Quote {
  id              String         @id @default(uuid())
  organizationId  String         @map("organization_id")
  contactId       String?        @map("contact_id")
  cadenceRunId    Int            @default(0) @map("cadence_run_id")
  title           String
  value           Decimal?       @db.Decimal(12, 2)
  businessStatus  BusinessStatus @default(draft) @map("business_status")
  ritmoStage      RitmoStage     @default(idle) @map("ritmo_stage")
  sentAt          DateTime?      @map("sent_at")
  firstSentAt     DateTime?      @map("first_sent_at")
  proposalLink    String?        @map("proposal_link")
  proposalFileId  String?        @map("proposal_file_id")
  // ...
  
  organization    Organization   @relation(fields: [organizationId], references: [id])
  contact         Contact?       @relation(fields: [contactId], references: [id])
  cadenceEvents   CadenceEvent[]
  
  @@index([organizationId, businessStatus])
  @@index([organizationId, ritmoStage])
  @@index([organizationId, firstSentAt])
  @@map("quotes")
}

model CadenceEvent {
  id              String              @id @default(uuid())
  quoteId         String              @map("quote_id")
  cadenceRunId    Int                 @map("cadence_run_id")
  eventType       String              @map("event_type")
  scheduledFor    DateTime            @map("scheduled_for")
  status          CadenceEventStatus  @default(scheduled)
  priority        CallPriority?
  skipReason      String?             @map("skip_reason")
  cancelReason    String?             @map("cancel_reason")
  claimedAt       DateTime?           @map("claimed_at")
  claimedBy       String?             @map("claimed_by")
  processedAt     DateTime?           @map("processed_at")
  // ...
  
  @@unique([quoteId, cadenceRunId, eventType])
  @@index([status, scheduledFor, claimedAt])
  @@map("cadence_events")
}
```

### 10.3 Claim Query Snippet

```typescript
// services/cadence.service.ts

async function claimEvents(workerId: string, batchSize = 20) {
  return prisma.$queryRaw<CadenceEvent[]>`
    UPDATE cadence_events
    SET 
      status = 'claimed'::"CadenceEventStatus",
      claimed_at = NOW(),
      claimed_by = ${workerId}
    WHERE id IN (
      SELECT id FROM cadence_events
      WHERE status = 'scheduled'::"CadenceEventStatus"
        AND scheduled_for <= NOW()
        AND claimed_at IS NULL
      ORDER BY scheduled_for
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `;
}

async function releaseOrphanClaims(timeoutMinutes = 5) {
  return prisma.$executeRaw`
    UPDATE cadence_events
    SET 
      status = 'scheduled'::"CadenceEventStatus",
      claimed_at = NULL,
      claimed_by = NULL
    WHERE status = 'claimed'::"CadenceEventStatus"
      AND claimed_at < NOW() - INTERVAL '${timeoutMinutes} minutes';
  `;
}
```

### 10.4 Estrutura de Pastas Recomendada

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   ├── quotes/
│   │   ├── templates/
│   │   └── settings/
│   └── api/
│       ├── auth/
│       ├── quotes/
│       ├── cron/
│       │   └── process-cadence/
│       └── webhooks/
├── components/
│   ├── ui/
│   ├── dashboard/
│   │   ├── EmailCard.tsx
│   │   ├── CallCard.tsx        # v1.1: com CTA proposta
│   │   └── StatsWidget.tsx
│   ├── quotes/
│   │   ├── QuoteTimeline.tsx
│   │   └── ProposalUpload.tsx  # v1.1: 3 opções
│   └── common/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── business-days.ts
│   ├── email.ts
│   └── stripe.ts
├── services/
│   ├── cadence.service.ts      # v1.1: claim logic
│   ├── email.service.ts
│   └── billing.service.ts      # v1.1: first_sent_at
└── types/
    └── index.ts
```

---

## Conclusão

A versão 1.1 do plano corrige as inconsistências identificadas:

| Problema | Solução v1.1 |
|----------|--------------|
| Email obrigatório em contacts | NULLABLE + skip_reason='no_email' |
| Confusão status/stage | Separação business_status + ritmo_stage |
| Race condition cron | Claim com `FOR UPDATE SKIP LOCKED` |
| Enum sem 'skipped' | Adicionado + skip_reason/cancel_reason |
| Billing duplicado em reenvio | first_sent_at imutável |
| Call card sem proposta | CTA com 3 opções |

O sistema mantém todas as regras originais (dias úteis, janela 9-18, 48h, suppressions, cadence_run_id, inbound BCC).

---

*Documento v1.1 — Revisado 2026-01-17*
