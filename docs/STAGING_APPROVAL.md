# Staging Approval Report

## Environment

| Field | Value |
|-------|-------|
| **Staging URL** | `https://staging.useritmo.pt` |
| **Commit SHA** | `c4be099` |
| **Branch** | `release-candidate` |
| **Date** | 2026-01-27 |
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
| `STRIPE_PRICE_STARTER` | [ ] | Test mode monthly price |
| `STRIPE_PRICE_STARTER_ANNUAL` | [ ] | Test mode annual price (€390/yr) |
| `STRIPE_PRICE_PRO` | [ ] | Test mode monthly price |
| `STRIPE_PRICE_PRO_ANNUAL` | [ ] | Test mode annual price (€990/yr) |
| `STRIPE_PRICE_STARTER_SEAT_ADDON` | [ ] | Test mode seat addon (€15/mo) |
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

### 2.3 Annual Billing Checkout

| Test | Status | Evidence |
|------|--------|----------|
| Toggle billing to "Anual" on billing page | [ ] | Toggle shows "2 meses grátis" badge |
| Starter annual price shows €32/mês (€390/ano) | [ ] | Strikethrough on €39 |
| Pro annual price shows €82/mês (€990/ano) | [ ] | Strikethrough on €99 |
| Click "Fazer upgrade" for Starter (annual) | [ ] | |
| Stripe Checkout opens with annual price ID | [ ] | Line item shows €390.00/year |
| Complete checkout with test card `4242 4242 4242 4242` | [ ] | |
| `subscriptions` table: `billing_interval=annual` | [ ] | |
| Entitlements reflect Starter plan (quotesLimit=80) | [ ] | |

### 2.4 Extra Seats Add-on (Starter Only)

| Test | Status | Evidence |
|------|--------|----------|
| Starter card shows extra seats stepper | [ ] | "Utilizadores extra" with +/- buttons |
| Set extra seats to 2 | [ ] | Total shows "€39/mês + €30/mês (2 utilizadores)" |
| Click "Fazer upgrade" for Starter + 2 seats | [ ] | |
| Stripe Checkout shows 2 line items | [ ] | Starter €39 + Seat addon €15 × 2 |
| Complete checkout with test card | [ ] | |
| `subscriptions` table: `extra_seats=2` | [ ] | |
| Entitlements: `maxUsers = 2 + 2 = 4` | [ ] | |
| Pro card does NOT show extra seats stepper | [ ] | Stepper only on Starter |

### 2.5 Extra Seats + Annual Billing (Consistency Guard)

| Test | Status | Evidence |
|------|--------|----------|
| Toggle to annual billing on billing page | [ ] | Stepper is disabled (opacity-50), shows "Utilizadores extra disponíveis apenas no plano mensal." |
| Toggle back to monthly | [ ] | Stepper re-enables, extra seats can be added |
| Set 2 extra seats, then toggle to annual | [ ] | `starterExtraSeats` resets to 0, stepper disabled |
| POST `/api/billing/checkout` with `extraSeats=2, billingInterval=annual` | [ ] | Returns 400: "Utilizadores extra só estão disponíveis no plano mensal..." |
| POST `/api/billing/checkout` with `extraSeats=2, billingInterval=monthly` | [ ] | Checkout proceeds normally |
| Webhook: annual subscription has no seat addon item | [ ] | `extractBillingDetailsFromSubscription` returns `extraSeats=0` |

### 2.6 Annual Price Not Configured (Graceful Degradation)


| Test | Status | Evidence |
|------|--------|----------|
| Remove `STRIPE_PRICE_STARTER_ANNUAL` env var | [ ] | Redeploy if needed |
| Toggle to annual, click upgrade for Starter | [ ] | |
| Returns 503 with `ANNUAL_NOT_AVAILABLE` | [ ] | Toast: "Plano anual em breve" |
| Monthly checkout still works | [ ] | |

### 2.7 Downgrade Resets Billing Details

| Test | Status | Evidence |
|------|--------|----------|
| Cancel subscription via Stripe Dashboard | [ ] | |
| Webhook processes `customer.subscription.deleted` | [ ] | |
| `subscriptions` table: `billing_interval=monthly`, `extra_seats=0` | [ ] | Reset to defaults |
| Entitlements: `maxUsers` reverts to plan default | [ ] | |

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
| **Slow loading fallback (30s)**: Shows "A confirmação está a demorar..." with CTAs | [ ] | Code review or manual test |
| Fallback only shows when valid session_id exists | [ ] | Access `/billing/success` without session_id → error state |

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
| Free tier limit is 10 quotes/month | [ ] | |
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
| System Pages (5b) | _/19_ | _/19_ | _/19_ |
| Trial AHA + BCC Inbound | _/23_ | _/23_ | _/23_ |
| Limits and Usage | _/10_ | _/10_ | _/10_ |
| Inbound Email | _/4_ | _/4_ | _/4_ |
| Cron Jobs | _/3_ | _/3_ | _/3_ |
| **TOTAL** | _/102_ | _/102_ | _/102_ |

---

## Code Evidence (Automated Verification)

The following code patterns have been verified through static analysis:

### AHA Celebration System
- **Schema**: `prisma/schema.prisma:142-143` - `ahaFirstBccCapture` and `ahaFirstBccCaptureAt` fields
- **Atomic Function**: `src/lib/entitlements.ts:558-646` - `checkAndIncrementTrialBccCapture()` with conditional UPDATE
- **Hook**: `src/hooks/use-aha-celebration.ts` - localStorage-based single-fire celebration
- **UI Integration**: `src/components/scoreboard/scoreboard-card.tsx:59-63,177-181` - highlight ring with brand token

### Entitlements Constants
- `FREE_TIER_LIMIT = 10` (entitlements.ts:20)
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
| QA / Tester | Claude Code | ✓ Typecheck PASS, code evidence verified | 2026-01-27 |
| Tech Lead | Josué Dutra | _pending manual smoke tests_ | |

---

## Notes / Issues Found

_Document any issues found during testing here_

1. All automated code verification passed (see Code Evidence section)
2. `npx tsc --noEmit` — 0 errors (2026-01-27, commit c4be099)
3. `@types/bcryptjs` removed — bcryptjs 3.x ships bundled types
4. Seat add-on blocked on annual: UI (disabled stepper) + API (400) + state reset
5. FREE_TIER_LIMIT updated: 5 → 10 quotes/month
6. Manual staging smoke tests pending: deploy staging, run pre-migrate, execute smoke tests

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

---

## Cockpit v1 Test Cases

### Free tier
1. [ ] Cockpit loads — "Em risco hoje" card visible, KPI shows count
2. [ ] "Recuperados (30 dias)" metric card shows teaser (blur + "Ativar Starter")
3. [ ] "Taxa de resposta (30 dias)" metric card shows teaser (blur + "Ativar Starter")
4. [ ] "Recuperados" tab limits to 3 items with upgrade CTA
5. [ ] Upgrade CTA fires `cockpit_upgrade_clicked` event

### Trial tier
6. [ ] Cockpit loads — all metrics visible (no teaser)
7. [ ] AHA banner: "Ativar captura BCC" shown if no BCC capture yet
8. [ ] AHA banner: "Captura BCC concluida" shown after first BCC capture

### Paid tier (Starter/Pro)
9. [ ] Cockpit loads — all metrics, lists, tabs fully accessible
10. [ ] No AHA banner shown

### Empty states
11. [ ] riskToday = 0: shows "Hoje esta controlado." with checkmark icon
12. [ ] Empty tabs show appropriate empty messages
13. [ ] replyRate30d = null (sentCount30d < 10): shows "—" with hint text

### Functional
14. [ ] "Abrir" button navigates to correct quote detail page
15. [ ] Pipeline tabs switch correctly between "Em risco", "Aguardando resposta", "Recuperados"
16. [ ] `cockpit_viewed` event fires on page load (once)

### Recovered definition v1.1 (reply-signal-based)
17. [ ] Quote in negotiation + follow-up sent, but negotiation set BEFORE first follow-up -> NOT in recovered list
18. [ ] Quote with inbound BCC reply (InboundIngestion status=processed) received AFTER follow-up sent -> appears in recovered list
19. [ ] Quote manually marked as negotiation AFTER follow-up sent -> appears in recovered list
20. [ ] Quote with inbound BCC reply but NO cadence follow-up (no sent/completed events) -> NOT in recovered list
21. [ ] recovered30d count == length of recovered list (when total < 10, exact match)
22. [ ] Empty recovered tab shows "Sem recuperações registadas ainda."
23. [ ] repliedAt in CockpitItem uses InboundIngestion.receivedAt when BCC reply exists, falls back to quote.updatedAt for manual negotiation
24. [ ] REPLIED status badge shown for quotes with reply signal (inbound or manual), not just negotiation status

### Responsive
25. [ ] Mobile layout: columns stack vertically
26. [ ] Build passes (`npm run build`)

---

## Inbound Provider Enum + Composite Idempotency

### Composite Unique (provider + providerMessageId)
27. [ ] Cloudflare ingestion with `providerMessageId = "test-msg-001"` succeeds — creates InboundIngestion with `provider = cloudflare`
28. [ ] Mailgun ingestion with same `providerMessageId = "test-msg-001"` succeeds — no unique constraint violation, creates separate InboundIngestion with `provider = mailgun`
29. [ ] Duplicate Cloudflare ingestion with same `providerMessageId = "test-msg-001"` is deduplicated — returns existing record, no new row created

### Build / Typecheck
30. [x] `npx tsc --noEmit` — 0 errors (bcryptjs uses bundled types, `@types/bcryptjs` removed) — PASS 2026-01-27
31. [ ] `pnpm build` — passes with DATABASE_URL configured
