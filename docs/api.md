# API & Endpoints

A API é construída utilizando Next.js Route Handlers.

## 1. Autenticação

Todos os endpoints protegidos requerem uma sessão válida (NextAuth) ou, no caso de Cron/Webhooks, chaves de API específicas.

- `POST /api/auth/register`: Registo de nova organização e utilizador admin.
- `POST /api/auth/login`: Login (gerido pelo NextAuth).

## 2. Quotes (Orçamentos)

Endpoints principais para gestão do ciclo de vida dos orçamentos.

### Criar Orçamento
`POST /api/quotes`
```json
{
  "contact_id": "uuid",
  "title": "Manutenção AVAC Anual",
  "service_type": "Manutenção",
  "value": 2500.00,
  "valid_until": "2026-02-15"
}
```
*Estado inicial:* `business_status='draft'`, `ritmo_stage='idle'`.

### Enviar / Iniciar Cadência
`PATCH /api/quotes/:id/send`
```json
{
  "sent_at": "2026-01-17T10:00:00Z" // opcional, default=agora
}
```
**Efeitos:**
1. Define `first_sent_at` (se for o primeiro envio) → Incrementa Cota de Billing.
2. Incrementa `cadence_run_id`.
3. Cancela eventos anteriores.
4. Gera novos eventos (D+1, D+3, D+7, D+14) baseados em dias úteis.
5. Define `business_status='sent'` e `ritmo_stage='fup_d1'`.

### Atualizar Status
`PATCH /api/quotes/:id/status`
```json
{
  "business_status": "won" // "won", "lost", "negotiation"
}
```
Se alterado para `won` ou `lost`, a cadência para imediatamente (`ritmo_stage='stopped'`).

## 3. Propostas (Ficheiros)

- `PATCH /api/quotes/:id/proposal-link`: Associar link externo (Google Drive, etc.).
- `POST /api/quotes/:id/proposal-upload`: Upload de ficheiro PDF (multipart/form-data).
- `GET /api/quotes/:id/proposal-download`: Redireciona para URL assinada temporária.
- `GET /api/quotes/:id/bcc-address`: Retorna o endereço BCC único (`bcc+{org}+{quote}@...`).

## 4. Motor de Cadência (Cron)

O processamento é feito via endpoint HTTP seguro, invocado pelo Vercel Cron.

`POST /api/cron/process-cadence`
- **Auth:** Header `Authorization: Bearer <CRON_SECRET>`
- **Body:** `{ "worker_id": "opcional-id" }`
- **Retorno:**
```json
{
  "processed": 12,
  "sent": 8,
  "skipped": 2,
  "deferred": 2,
  "failed": 0,
  "duration_ms": 2340
}
```

## 5. Webhooks

### Inbound Email (Resend)
`POST /api/webhooks/inbound-email`
Recebe o payload JSON do Resend quando um email é enviado para o BCC do sistema. Processa anexos e associa ao orçamento correto.

### Stripe
`POST /api/webhooks/stripe`
Atualiza estados de subscrição.

## 6. Dashboard & Dados

- `GET /api/dashboard/actions-today`: Lista de emails e chamadas agendadas para hoje.
- `GET /api/dashboard/stats`: Estatísticas gerais (pipeline, conversão).
