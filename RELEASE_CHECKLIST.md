# Release Checklist - Ritmo MVP

Checklist final antes de abrir para clientes.

## 1. Migrações e Seeds

- [ ] Executar `prisma migrate deploy` no ambiente alvo
- [ ] Verificar que `pre-migrate.ts` correu (planos criados)
- [ ] Confirmar `stripePriceId` preenchido para starter/pro/enterprise:
  - [ ] Ambiente de teste (Stripe Test Mode)
  - [ ] Ambiente de produção (Stripe Live Mode)

```bash
# Verificar planos na DB
SELECT id, name, stripe_price_id FROM plans;
```

## 2. Stripe (Produção)

### Variáveis de Ambiente

- [ ] `STRIPE_SECRET_KEY` configurado no Vercel (live key: `sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado (do webhook de produção)

### Configuração no Dashboard Stripe

- [ ] Webhook configurado para:
  - URL: `https://app.ritmo.app/api/webhooks/stripe`
  - Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
- [ ] URLs de retorno do Checkout configuradas para domínio final
- [ ] Customer Portal ativado e configurado

### Teste de Integração

- [ ] Fazer um checkout real no Stripe (pode cancelar depois)
- [ ] Verificar mapeamento de status funciona:
  - `active` → permite envios
  - `past_due` → HTTP 402
  - `cancelled` → HTTP 403
  - `trialing` → permite envios

## 3. Mailgun Inbound (Produção)

### Configuração

- [ ] Route ativa no Mailgun apontando para `https://app.ritmo.app/api/inbound/mailgun`
- [ ] `MAILGUN_SIGNING_KEY` configurado no Vercel

### Teste

- [ ] Enviar email com PDF anexo para endereço BCC de teste
- [ ] Enviar email com link no corpo para endereço BCC de teste
- [ ] Verificar que proposta aparece no orçamento

## 4. Observabilidade

### Logs Implementados

- [x] Webhook Stripe: event type, processed ok/erro
- [x] Inbound Mailgun: processed/unmatched/rejected
- [x] Cron cadence: counts (completed/failed/skipped)

### Alertas

- [ ] Configurar alerta para erros 5xx em:
  - `/api/webhooks/stripe`
  - `/api/inbound/mailgun`
  - `/api/cron/process-cadence`

### Onde Ver Logs

- Vercel Dashboard → Project → Logs
- Filtrar por: `endpoint:webhooks/stripe`, `endpoint:cron/process-cadence`, `route:api/inbound/mailgun`

## 5. Segurança

### Endpoint Admin/Seed

- [x] Endpoint `/api/admin/seed` protegido por:
  - `ADMIN_SEED_ENABLED=true` (desativado por defeito em produção)
  - `ADMIN_SEED_SECRET` header obrigatório

**Após seeding de produção:**

- [ ] Remover `ADMIN_SEED_ENABLED` do Vercel (ou definir como `false`)
- [ ] Considerar remover o ficheiro `src/app/api/admin/seed/route.ts`

### Outras Verificações

- [ ] Todas as rotas de API verificam autenticação
- [ ] Dados sensíveis não aparecem em logs (emails mascarados)
- [ ] HTTPS forçado em produção

## 6. E2E em CI

### Configuração GitHub Actions

- [x] Workflow `e2e.yml` configurado
- [x] Workflow `ci.yml` com lint/typecheck/build

### Secrets Necessários no GitHub

- [ ] `DATABASE_URL` (pode ser DB de teste dedicada)
- [ ] `NEXTAUTH_SECRET`
- [ ] `TEST_USER_EMAIL`
- [ ] `TEST_USER_PASSWORD`

### Branch Protection

- [ ] Ativar "Require status checks to pass" para `main`:
  - CI / Lint & Typecheck
  - CI / Unit Tests
  - CI / Build
  - E2E Tests / e2e

## 7. Variáveis de Ambiente Completas

```
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=https://app.ritmo.app

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mailgun
MAILGUN_SIGNING_KEY=key-...

# Supabase (Storage)
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cron
CRON_SECRET=<random-secret>

# Admin (remover após seed)
ADMIN_SEED_SECRET=<random-secret>
# ADMIN_SEED_ENABLED=true  # Só ativar temporariamente

# Optional: Resend fallback
RESEND_API_KEY=re_...
```

## 8. Pós-Deploy

- [ ] Verificar que a app carrega sem erros
- [ ] Testar login com utilizador real
- [ ] Criar um orçamento de teste
- [ ] Marcar como enviado e verificar cadência criada
- [ ] Verificar billing page carrega corretamente

---

**Data do último review:** _______________

**Aprovado por:** _______________
