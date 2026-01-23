# Staging Approval Report

## Environment

| Field | Value |
|-------|-------|
| **Staging URL** | `https://staging.useritmo.pt` |
| **Commit SHA** | `9420a5c` |
| **Branch** | `release-candidate` |
| **Date** | 2026-01-23 |
| **Tester** | Claude Code (automated) + Manual QA |

## Environment Variables Configured

| Variable | Status | Notes |
|----------|--------|-------|
| `NEXTAUTH_URL` | [ ] | Should be staging domain |
| `NEXT_PUBLIC_APP_URL` | [ ] | Should be staging domain |
| `DATABASE_URL` | [ ] | Staging database (Neon branch) |
| `NEXTAUTH_SECRET` | [ ] | Unique for staging |
| `GOOGLE_CLIENT_ID` | [ ] | OAuth configured |
| `GOOGLE_CLIENT_SECRET` | [ ] | OAuth configured |
| `STRIPE_SECRET_KEY` | [ ] | **Must be sk_test_...** |
| `STRIPE_WEBHOOK_SECRET` | [ ] | Staging webhook endpoint |
| `STRIPE_PRICE_STARTER` | [ ] | Test mode price |
| `STRIPE_PRICE_PRO` | [ ] | Test mode price |
| `STRIPE_PRICE_PRO_PLUS` | [ ] | Test mode price (optional) |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | [ ] | Set to "true" for billing tests |
| `RESEND_API_KEY` | [ ] | Configured |
| `EMAIL_FROM` | [ ] | Valid sender |
| `CRON_SECRET` | [ ] | Unique for staging |
| `OPS_TOKEN` | [ ] | Unique for staging |
| `INBOUND_SECRET` | [ ] | Cloudflare worker secret |
| `SENTRY_DSN` | [ ] | Staging Sentry project |

---

## Database / Migrations

| Step | Status | Notes |
|------|--------|-------|
| `npx tsx prisma/pre-migrate.ts` executed | [ ] | |
| `npx prisma db push` executed | [ ] | |
| `npx prisma db seed` executed | [ ] | |
| StripeEvent table has `status` column | [ ] | Verify with: `SELECT column_name FROM information_schema.columns WHERE table_name='stripe_events'` |
| StripeEvent table has `claimed_at` column | [ ] | |
| StripeEvent table has `error_message` column | [ ] | |
| Plans table has 5 plans (free, starter, pro, pro_plus, enterprise) | [ ] | |
| pro_plus.is_public = false | [ ] | |
| enterprise.is_active = false | [ ] | |

---

## 1. Security / Identity Tests

### 1.1 Signup (New User)

| Test | Status | Evidence |
|------|--------|----------|
| Create new user via UI | [ ] | |
| Verify passwordHash starts with `$2` (bcrypt) | [ ] | Query: `SELECT id, email, substring(password_hash, 1, 4) FROM users WHERE email='...'` |

### 1.2 Legacy Password Upgrade

| Test | Status | Evidence |
|------|--------|----------|
| Insert user with plaintext password (staging only) | [ ] | `UPDATE users SET password_hash='testplain123' WHERE email='...'` |
| Login with plaintext password | [ ] | |
| Verify passwordHash now starts with `$2` | [ ] | |

### 1.3 Forgot Password (Anti-Enumeration)

| Test | Status | Evidence |
|------|--------|----------|
| POST `/api/auth/forgot-password` with **existing** email | [ ] | Response: `{"success":true,"message":"Se o email existir..."}` |
| POST `/api/auth/forgot-password` with **non-existing** email | [ ] | Response: `{"success":true,"message":"Se o email existir..."}` |
| Responses are **identical** | [ ] | Compare HTTP status + body |

### 1.4 Forgot Password (Rate Limit + Cooldown)

| Test | Status | Evidence |
|------|--------|----------|
| Request reset for same email twice within 60s | [ ] | Second request returns 200 but no new token created |
| Check `password_reset_tokens` table | [ ] | Only 1 token exists |
| Request reset >5 times in 1 hour | [ ] | 6th request returns 200 but no token/email |

### 1.5 Reset Password Flow

| Test | Status | Evidence |
|------|--------|----------|
| Receive reset email with valid link | [ ] | |
| Click link, set new password | [ ] | |
| Response: success | [ ] | |
| Login with new password works | [ ] | |
| Old password no longer works | [ ] | |
| Token marked as used or deleted | [ ] | Check `password_reset_tokens` table |
| Session invalidation (if testable) | [ ] | Optional: check other browser logged out |

---

## 2. Billing Tests

### 2.1 Payments Disabled (NEXT_PUBLIC_PAYMENTS_ENABLED=false)

| Test | Status | Evidence |
|------|--------|----------|
| Set `NEXT_PUBLIC_PAYMENTS_ENABLED=false` | [ ] | Redeploy if needed |
| Billing page shows "Pagamentos em breve" banner | [ ] | Screenshot |
| Click upgrade button | [ ] | |
| Toast shows "Pagamentos em breve" | [ ] | |
| POST `/api/billing/checkout` returns 503 | [ ] | `{"error":"PAYMENTS_DISABLED",...}` |

### 2.2 Payments Enabled (NEXT_PUBLIC_PAYMENTS_ENABLED=true)

| Test | Status | Evidence |
|------|--------|----------|
| Set `NEXT_PUBLIC_PAYMENTS_ENABLED=true` | [ ] | Redeploy if needed |
| Billing page shows upgrade buttons | [ ] | |
| Click "Fazer upgrade" for Starter plan | [ ] | |
| Stripe Checkout opens | [ ] | |
| Complete checkout with test card `4242 4242 4242 4242` | [ ] | |
| Redirected to `/settings/billing?success=true` | [ ] | |
| Success toast/banner shown | [ ] | |
| `subscriptions` table updated with planId=starter | [ ] | |
| `stripe_events` table has checkout.session.completed event | [ ] | status=PROCESSED |
| Entitlements reflect new plan (quotesLimit=80) | [ ] | |

---

## 3. Stripe Webhook Tests

### 3.1 Idempotency (Duplicate Event)

| Test | Status | Evidence |
|------|--------|----------|
| Send webhook event (use Stripe CLI or replay) | [ ] | |
| First request: status changes PROCESSING → PROCESSED | [ ] | |
| Send **same event** again | [ ] | |
| Second request returns `{"received":true,"duplicate":true}` | [ ] | |
| `stripe_events` table still has status=PROCESSED | [ ] | |

### 3.2 Failed Event + Retry

| Test | Status | Evidence |
|------|--------|----------|
| Simulate processing failure (modify code or use invalid data) | [ ] | |
| Event status = FAILED | [ ] | |
| `error_message` contains error description | [ ] | |
| Trigger retry (Stripe CLI or manual) | [ ] | |
| Status changes FAILED → PROCESSING → PROCESSED | [ ] | |

### 3.3 Stale Processing Recovery

| Test | Status | Evidence |
|------|--------|----------|
| Manually set `claimed_at` to >5 min ago in DB | [ ] | `UPDATE stripe_events SET claimed_at = NOW() - INTERVAL '10 minutes' WHERE ...` |
| Send same event via webhook | [ ] | |
| Log shows "Taking over stale processing event" | [ ] | |
| Event is reprocessed successfully | [ ] | |

---

## 4. Plans / UI Tests

| Test | Status | Evidence |
|------|--------|----------|
| Billing page shows only: free, starter, pro | [ ] | |
| pro_plus is **NOT** visible | [ ] | |
| enterprise is **NOT** visible | [ ] | |
| No self-serve checkout path for pro_plus | [ ] | POST to `/api/billing/checkout` with `planKey=pro_plus` returns error |

---

## 5. Onboarding Premium

| Test | Status | Evidence |
|------|--------|----------|
| "Guardar e sair" does NOT complete onboarding | [ ] | User returns to wizard on next visit |
| SMTP default is "Enviar via Ritmo" with "Recomendado" badge | [ ] | Screenshot |
| Choosing "SMTP proprio" without config blocks advancement | [ ] | Shows 2 CTAs: "Configurar SMTP" + "Usar Ritmo por agora" |
| Copy PT-PT: no emojis, short messages | [ ] | Visual review |
| Gradient CTA only on primary button | [ ] | Screenshot |
| **StatusBadge in Step 4 (BCC)** shows correct status | [ ] | Screenshot |
| StatusBadge shows "Ativo" when BCC enabled | [ ] | |
| StatusBadge shows "Indisponível" when BCC disabled | [ ] | |
| StatusBadge shows "Limite atingido" when trial limit reached | [ ] | |
| **StatusBadge in Step 5 (Summary)** reflects BCC status | [ ] | Screenshot |

---

## 5b. System Pages (NEW in 9420a5c)

### 5b.1 SignOut UX

| Test | Status | Evidence |
|------|--------|----------|
| Click logout button in app header | [ ] | |
| Redirects to landing page (`/`) | [ ] | |
| Toast "Sessão terminada" appears | [ ] | Screenshot |
| URL shows `?signed_out=1` briefly then cleans up | [ ] | |

### 5b.2 Billing Success Page

| Test | Status | Evidence |
|------|--------|----------|
| Complete Stripe checkout successfully | [ ] | |
| Redirected to `/billing/success?session_id=cs_xxx` | [ ] | |
| Loading state shows "A confirmar subscrição..." | [ ] | |
| Success state shows "Plano ativado" | [ ] | Screenshot |
| Subscription summary shows: plan name, price, next billing date | [ ] | |
| "Ir para o Dashboard" button works | [ ] | |
| "Ver faturação" button works | [ ] | |

### 5b.3 Billing Cancel Page

| Test | Status | Evidence |
|------|--------|----------|
| Cancel/close Stripe checkout | [ ] | |
| Redirected to `/billing/cancel` | [ ] | |
| Page shows "Checkout cancelado" | [ ] | Screenshot |
| Page shows "Nenhuma cobrança foi efetuada" | [ ] | |
| "Tentar novamente" button → `/settings/billing` | [ ] | |
| "Voltar ao Dashboard" button → `/dashboard` | [ ] | |

### 5b.4 API: /api/billing/verify

| Test | Status | Evidence |
|------|--------|----------|
| GET without session_id returns 400 | [ ] | `{"success":false,"message":"session_id é obrigatório"}` |
| GET with invalid session_id returns error | [ ] | |
| GET with valid session_id returns subscription details | [ ] | |

---

## 6. Trial AHA + BCC Inbound

### 6.1 First BCC Capture (Trial)

| Test | Status | Evidence |
|------|--------|----------|
| Send BCC email with PDF to trial org | [ ] | |
| Inbound processes successfully | [ ] | status=processed |
| Proposal associated with quote | [ ] | Quote has proposalFileId or proposalLink |
| `ahaFirstBccCapture=true` set | [ ] | Query: `SELECT aha_first_bcc_capture FROM organizations WHERE id='...'` |
| `ahaFirstBccCaptureAt` is set | [ ] | Query: `SELECT aha_first_bcc_capture_at FROM organizations WHERE id='...'` |
| Toast "Captura concluida" appears ONCE | [ ] | Visual |
| Scoreboard highlight appears ~1500ms | [ ] | Visual |
| Telemetry: AHA_BCC_INBOUND_FIRST_SUCCESS logged | [ ] | Check product_events table |

### 6.2 Celebration Does NOT Repeat

| Test | Status | Evidence |
|------|--------|----------|
| Refresh page | [ ] | Toast does NOT reappear |
| Highlight does NOT reappear | [ ] | |
| localStorage key exists: `ritmo:lastSeenAhaAt:<orgId>` | [ ] | DevTools > Application > LocalStorage |

### 6.3 Second BCC Capture (Trial Limit)

| Test | Status | Evidence |
|------|--------|----------|
| Send 2nd BCC email | [ ] | |
| Response: 200 "received" (non-revelatory) | [ ] | |
| InboundIngestion.status = `rejected_trial_limit` | [ ] | |
| Log shows `expected: true` flag | [ ] | Vercel logs |
| Telemetry: PAYWALL_SHOWN logged | [ ] | Check product_events |
| Toast does NOT appear | [ ] | |
| UI banner shows "BCC: 1/1" + upgrade CTA | [ ] | LifecycleBanner |

### 6.4 Duplicate Inbound (Idempotency)

| Test | Status | Evidence |
|------|--------|----------|
| Send same email again (same Message-Id) | [ ] | |
| Response: `{"status":"duplicate","id":"..."}` | [ ] | |
| No new InboundIngestion created | [ ] | |
| No telemetry duplicated | [ ] | |
| Celebration does NOT trigger | [ ] | |

### 6.5 Concurrency Test (Race Condition)

| Test | Status | Evidence |
|------|--------|----------|
| Send 2 inbounds simultaneously to Trial org | [ ] | Use parallel curl or artillery |
| Only 1 capture is accepted (isFirstCapture=true) | [ ] | |
| Second request gets rejected_trial_limit | [ ] | |
| Organization.trialBccCaptures = 1 (not 2) | [ ] | Query: `SELECT trial_bcc_captures FROM organizations WHERE id='...'` |
| Atomic UPDATE pattern prevents race | [ ] | Code: `checkAndIncrementTrialBccCapture()` in entitlements.ts:584-595 |

---

## 7. Limits and Usage

### 7.1 Free Tier

| Test | Status | Evidence |
|------|--------|----------|
| Free tier limit is 5 quotes/month | [ ] | |
| Manual send counts toward limit | [ ] | Check MANUAL_SEND_MARKED event |
| BCC inbound NOT allowed (bccInboundEnabled=false) | [ ] | |
| Scoreboard shows teaser/locked | [ ] | |

### 7.2 Trial Tier

| Test | Status | Evidence |
|------|--------|----------|
| Trial limit is 20 quotes | [ ] | |
| Trial BCC limit is 1 capture | [ ] | |
| Scoreboard fully accessible | [ ] | |
| MAX_RESENDS_PER_MONTH = 2 | [ ] | |

### 7.3 Trial Expiration

| Test | Status | Evidence |
|------|--------|----------|
| After trial_ends_at passes, tier = "free" | [ ] | |
| bccInboundEnabled = false | [ ] | |
| autoEmailEnabled = false | [ ] | |
| UI shows trial expired message | [ ] | |

---

## 8. Inbound Email Tests

| Test | Status | Evidence |
|------|--------|----------|
| Send email to `all+{orgShortId}+{quotePublicId}@inbound.useritmo.pt` | [ ] | |
| Webhook `/api/inbound/cloudflare` receives request | [ ] | Check Vercel logs |
| Returns 200 | [ ] | |
| Quote updated with proposal (if applicable) | [ ] | |

---

## 6. Cron Jobs

| Test | Status | Evidence |
|------|--------|----------|
| `/api/cron/process-cadence` accessible with CRON_SECRET | [ ] | |
| `/api/cron/calculate-metrics` accessible with CRON_SECRET | [ ] | |
| `/api/cron/purge-proposals` accessible with CRON_SECRET | [ ] | |

---

## Summary

| Category | Pass | Fail | Skip |
|----------|------|------|------|
| Security / Identity | _/8_ | _/8_ | _/8_ |
| Billing | _/12_ | _/12_ | _/12_ |
| Stripe Webhook | _/9_ | _/9_ | _/9_ |
| Plans / UI | _/4_ | _/4_ | _/4_ |
| Onboarding Premium | _/10_ | _/10_ | _/10_ |
| System Pages (5b) | _/17_ | _/17_ | _/17_ |
| Trial AHA + BCC Inbound | _/23_ | _/23_ | _/23_ |
| Limits and Usage | _/10_ | _/10_ | _/10_ |
| Inbound Email | _/4_ | _/4_ | _/4_ |
| Cron Jobs | _/3_ | _/3_ | _/3_ |
| **TOTAL** | _/100_ | _/100_ | _/100_ |

---

## Code Evidence (Automated Verification)

The following code patterns have been verified through static analysis:

### AHA Celebration System
- **Schema**: `prisma/schema.prisma:142-143` - `ahaFirstBccCapture` and `ahaFirstBccCaptureAt` fields
- **Atomic Function**: `src/lib/entitlements.ts:558-646` - `checkAndIncrementTrialBccCapture()` with conditional UPDATE
- **Hook**: `src/hooks/use-aha-celebration.ts` - localStorage-based single-fire celebration
- **UI Integration**: `src/components/scoreboard/scoreboard-card.tsx:59-63,177-181` - highlight ring with brand token

### Entitlements Constants
- `FREE_TIER_LIMIT = 5` (entitlements.ts:20)
- `TRIAL_LIMIT = 20` (entitlements.ts:22)
- `TRIAL_DURATION_DAYS = 14` (entitlements.ts:24)
- `TRIAL_BCC_INBOUND_LIMIT = 1` (entitlements.ts:28)
- `MAX_RESENDS_PER_MONTH = 2` (entitlements.ts:25)

### Tier Logic
- Trial: `scoreboardEnabled = true`, `bccInboundEnabled = true` (entitlements.ts:234-236)
- Free: `scoreboardEnabled = false`, `bccInboundEnabled = false` (entitlements.ts:250-252)
- Trial expiration: `trialActive = org.trialEndsAt > now` (entitlements.ts:189)

### Brand Token
- `--color-brand: var(--brand-from)` in `globals.css:31-32`
- `ring-brand/30` in `scoreboard-card.tsx:144`

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA / Tester | | | |
| Tech Lead | | | |

---

## Notes / Issues Found

_Document any issues found during testing here_

1.
2.
3.

---

## Next Steps (Release Candidate)

After staging approval:

1. [ ] Create tag/branch `release-candidate`
2. [ ] Create PR to main with:
   - Summary of all changes from staging-hardening
   - Link to this approval report
   - Production checklist
3. [ ] Production environment checklist:
   - [ ] `STRIPE_SECRET_KEY` = sk_live_...
   - [ ] Create Stripe Live products/prices
   - [ ] Configure Live webhook endpoint
   - [ ] `NEXT_PUBLIC_PAYMENTS_ENABLED=true`
   - [ ] Verify all secrets are production-unique
4. [ ] Smoke test in production after deploy
