# Production Go-Live Plan

## Overview

| Field | Value |
|-------|-------|
| **RC Commit** | `9420a5c` |
| **Target Environment** | Production (`https://useritmo.pt`) |
| **Estimated Duration** | 30-45 minutes |
| **Rollback Window** | 24 hours |

---

## Pre-Requisites

- [ ] Staging QA PASS (see `docs/STAGING_APPROVAL.md`)
- [ ] RC Notes reviewed (see `docs/RC_NOTES.md`)
- [ ] On-call engineer available
- [ ] Slack channel #ritmo-alerts monitored

---

## Phase 1: Environment Variables (Production)

### Core Application

| Variable | Expected Value | Verified |
|----------|----------------|----------|
| `NEXTAUTH_URL` | `https://useritmo.pt` | [ ] |
| `NEXT_PUBLIC_APP_URL` | `https://useritmo.pt` | [ ] |
| `DATABASE_URL` | Production Neon connection string | [ ] |
| `NEXTAUTH_SECRET` | Unique 32+ char secret (prod) | [ ] |

### OAuth (Google)

| Variable | Expected Value | Verified |
|----------|----------------|----------|
| `GOOGLE_CLIENT_ID` | Production OAuth client ID | [ ] |
| `GOOGLE_CLIENT_SECRET` | Production OAuth secret | [ ] |

### Stripe (LIVE MODE)

| Variable | Expected Value | Verified |
|----------|----------------|----------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (NOT sk_test_) | [ ] |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (live endpoint) | [ ] |
| `STRIPE_PRICE_STARTER` | `price_...` (live Starter) | [ ] |
| `STRIPE_PRICE_PRO` | `price_...` (live Pro) | [ ] |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | `true` | [ ] |

### Email (Resend)

| Variable | Expected Value | Verified |
|----------|----------------|----------|
| `RESEND_API_KEY` | Production API key | [ ] |
| `EMAIL_FROM` | `Ritmo <noreply@useritmo.pt>` | [ ] |

### Security Tokens

| Variable | Expected Value | Verified |
|----------|----------------|----------|
| `CRON_SECRET` | Unique 32+ char secret (prod) | [ ] |
| `OPS_TOKEN` | Unique 32+ char secret (prod) | [ ] |
| `INBOUND_SECRET` | Cloudflare worker secret (prod) | [ ] |
| `TOKEN_SECRET` | Unique secret for JWT tokens | [ ] |
| `ENCRYPTION_SECRET` | Unique secret for encryption | [ ] |

### Monitoring

| Variable | Expected Value | Verified |
|----------|----------------|----------|
| `SENTRY_DSN` | Production Sentry project DSN | [ ] |

---

## Phase 2: Stripe Live Setup

### 2.1 Create Products (Stripe Dashboard)

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Ensure **Live mode** is selected (toggle in top-left)
3. Create products:

| Product | Price | Currency | Billing | Notes |
|---------|-------|----------|---------|-------|
| Ritmo Starter | €39.00 | EUR | Monthly | 80 quotes/month |
| Ritmo Pro | €99.00 | EUR | Monthly | 250 quotes/month |

4. Copy Price IDs (`price_...`) for env vars

### 2.2 Configure Webhook Endpoint

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Configure:

| Field | Value |
|-------|-------|
| Endpoint URL | `https://useritmo.pt/api/webhooks/stripe` |
| Events | See list below |

**Required Events (Minimum):**
- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Optional Events (Recommended):**
- `customer.created`
- `customer.updated`

4. Copy Signing Secret (`whsec_...`) for env var

### 2.3 Verify Stripe Configuration

```bash
# Run check script (from local with prod env)
npx tsx scripts/check-plans.js

# Expected output:
# - Starter: €39/month, 80 quotes
# - Pro: €99/month, 250 quotes
# - pro_plus: NOT public
# - enterprise: NOT active
```

---

## Phase 3: Database Preparation

### 3.1 Run Pre-Migration

```bash
# Connect to production database
npx tsx prisma/pre-migrate.ts
```

**Expected output:**
- short_id column populated
- Duplicate cleanup complete
- Plans updated with frozen pricing
- stripe_events has status column

### 3.2 Run Schema Push

```bash
npx prisma db push
```

**Verify new fields:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Organization'
AND column_name IN ('aha_first_bcc_capture', 'aha_first_bcc_capture_at');
```

### 3.3 Verify Plans

```sql
SELECT key, name, is_public, is_active, monthly_quote_limit, price_cents
FROM plans
ORDER BY price_cents;
```

**Expected:**
| key | name | is_public | is_active | monthly_quote_limit | price_cents |
|-----|------|-----------|-----------|---------------------|-------------|
| free | Gratuito | true | true | 5 | 0 |
| starter | Starter | true | true | 80 | 3900 |
| pro | Pro | true | true | 250 | 9900 |
| pro_plus | Pro+ | false | true | 500 | 14900 |
| enterprise | Enterprise | false | false | 1000 | 0 |

---

## Phase 4: Deployment

### 4.1 Deploy to Production

**Primary Strategy: Vercel CLI / Promote**

```bash
# Recommended: Use Vercel CLI for controlled deploy
vercel --prod

# Alternative: Promote existing preview deployment
# Go to Vercel Dashboard > Deployments > Find RC preview > "..." > Promote to Production
```

**Fallback: Git Push**

> ⚠️ **Warning**: Only use if Vercel CLI unavailable. This triggers auto-deploy immediately.

```bash
git push origin release-candidate:main
```

### 4.2 Monitor Deployment

- Watch Vercel deployment logs
- Check Sentry for immediate errors
- Monitor #ritmo-alerts Slack channel

---

## Phase 5: Smoke Tests (Production)

### 5.1 Basic Health

| Test | Command/Action | Expected | Status |
|------|----------------|----------|--------|
| Health endpoint | `curl https://useritmo.pt/api/health` | `{"status":"ok"}` | [ ] |
| Homepage loads | Visit `https://useritmo.pt` | Landing page renders | [ ] |
| Login page | Visit `https://useritmo.pt/login` | Login form shows | [ ] |

### 5.2 Authentication

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Google OAuth | Click "Entrar com Google" | Redirects to Google | [ ] |
| OAuth callback | Complete Google login | Redirects to dashboard/onboarding | [ ] |
| Session persists | Refresh page | Still logged in | [ ] |

### 5.3 Onboarding (New User)

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Wizard starts | First login | Onboarding wizard shows | [ ] |
| SMTP default | Check email step | "Enviar via Ritmo" selected | [ ] |
| Complete onboarding | Fill all steps | Dashboard loads | [ ] |

### 5.4 Billing - Real Checkout (Internal Account)

> **Pre-requisite**: Use an internal test account (e.g., `test@antigravity.pt`) for this test.

#### Step 1: Complete Checkout

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Billing page | Visit `/settings/billing` | Shows plans (Starter, Pro) | [ ] |
| Click upgrade | Click "Fazer upgrade" for Starter | Stripe Checkout opens | [ ] |
| Complete payment | Use real card (will be refunded) | Payment succeeds | [ ] |
| Redirect | After payment | Redirected to `/billing/success?session_id=cs_xxx` | [ ] |
| **Success page** | `/billing/success` loads | Shows "Plano ativado" with subscription summary | [ ] |
| **Subscription details** | Check success page | Shows plan name, price (€39/mês), next billing date | [ ] |

#### Step 2: Verify Subscription Created

| Verification | Command/Action | Expected | Status |
|--------------|----------------|----------|--------|
| Stripe Dashboard | Check Subscriptions | New subscription visible | [ ] |
| Database | `SELECT * FROM subscriptions WHERE organization_id='...'` | status=active, plan_id=starter | [ ] |
| Entitlements API | `curl /api/entitlements` | tier=paid, quotesLimit=80 | [ ] |
| Ops endpoint | `curl -H "Authorization: Bearer $OPS_TOKEN" /api/ops/stripe` | healthy=true, subscription visible | [ ] |

#### Step 3: Verify Webhook Processed

| Verification | Action | Expected | Status |
|--------------|--------|----------|--------|
| stripe_events table | Query recent events | `checkout.session.completed` with status=PROCESSED | [ ] |
| No errors | Check Sentry | No webhook errors | [ ] |

### 5.5 Billing - Cancel Flow Test

> **Purpose**: Verify checkout cancellation redirects correctly.

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Start checkout | Click upgrade, go to Stripe Checkout | Checkout page shows | [ ] |
| Close/cancel checkout | Click browser back or close Stripe | Redirected to `/billing/cancel` | [ ] |
| **Cancel page** | `/billing/cancel` loads | Shows "Checkout cancelado" | [ ] |
| **No charge message** | Check cancel page | Shows "Nenhuma cobrança foi efetuada" | [ ] |
| **CTA buttons** | Check cancel page | "Tentar novamente" + "Voltar ao Dashboard" buttons work | [ ] |

### 5.6 Billing - Subscription Cancel/Downgrade Test

> **Purpose**: Verify subscription cancellation flow works correctly.

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Cancel in Stripe | Stripe Dashboard > Cancel subscription | Subscription marked for cancellation | [ ] |
| Webhook received | Check stripe_events | `customer.subscription.updated` or `deleted` processed | [ ] |
| Entitlements update | `curl /api/entitlements` | tier changes (or stays until period end) | [ ] |
| UI reflects change | Refresh billing page | Shows updated status | [ ] |

> **Cleanup**: After test, refund the charge in Stripe Dashboard if needed.

### 5.7 SignOut UX Test

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Click logout | App header > Logout button | Redirects to landing page | [ ] |
| Toast shown | Check landing page | "Sessão terminada" toast appears | [ ] |
| URL clean | Check URL bar | `?signed_out=1` appears briefly then cleans up | [ ] |

### 5.8 Webhook Health (Final)

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Ops endpoint | `curl -H "Authorization: Bearer $OPS_TOKEN" https://useritmo.pt/api/ops/stripe` | healthy=true, no failures | [ ] |
| Stripe Dashboard | Check webhook endpoint | All recent events delivered successfully | [ ] |

---

## Phase 6: Post-Deploy Verification

### 6.1 Entitlements Check

```bash
# Via ops endpoint or direct DB query
curl -H "Authorization: Bearer $OPS_TOKEN" \
  "https://useritmo.pt/api/ops/metrics?check=entitlements"
```

### 6.2 Cron Jobs

| Endpoint | Test | Status |
|----------|------|--------|
| `/api/cron/process-cadence` | Trigger with CRON_SECRET | [ ] |
| `/api/cron/calculate-metrics` | Trigger with CRON_SECRET | [ ] |

### 6.3 Monitoring

- [ ] Sentry errors < 1% error rate
- [ ] Vercel function logs normal
- [ ] No 500 errors in last 15 minutes

---

## Rollback Plan

### Immediate Mitigation: Payments Kill Switch

> **Use this FIRST** if any billing-related issue is detected.

```bash
# Vercel Dashboard > Settings > Environment Variables
# Set: NEXT_PUBLIC_PAYMENTS_ENABLED = false
# Redeploy triggers automatically
```

**Effect**: Users see "Pagamentos em breve" banner. No checkout possible. Existing subscriptions unaffected.

---

### Scenario A: Minor Issues (Non-Blocking)

1. Create GitHub issue with P1 label
2. Continue monitoring
3. Fix in next deploy

### Scenario B: Billing Failure

1. **IMMEDIATE**: Set `NEXT_PUBLIC_PAYMENTS_ENABLED=false` in Vercel (see kill switch above)
2. Verify kill switch active: visit `/settings/billing` shows "Pagamentos em breve"
3. Investigate root cause:
   - Check Stripe webhook logs
   - Check Sentry for errors
   - Check stripe_events table for FAILED status
4. Fix and test in staging
5. Re-enable payments: `NEXT_PUBLIC_PAYMENTS_ENABLED=true`

### Scenario C: Critical Failure (App Down)

1. **IMMEDIATE**: Rollback to previous deployment in Vercel
   - Go to Vercel > Deployments
   - Find last good deployment
   - Click "..." > "Promote to Production"
2. Notify team in #ritmo-alerts
3. Investigate root cause
4. If billing-related, also apply Payments Kill Switch

### Scenario D: Data Corruption

1. **IMMEDIATE**: Apply Payments Kill Switch (prevent further damage)
2. Contact Neon support for point-in-time recovery
3. Restore from backup (RPO < 24h)
4. Verify data integrity
5. Redeploy with fixes

---

## Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Tech Lead | josue@antigravity.pt | During deploy |
| On-call | #ritmo-alerts | 24/7 |
| Neon Support | support@neon.tech | 24/7 |
| Stripe Support | Dashboard chat | Business hours |

---

## Sign-Off

| Phase | Completed By | Date | Notes |
|-------|--------------|------|-------|
| Environment Variables | | | |
| Stripe Live Setup | | | |
| Database Preparation | | | |
| Deployment | | | |
| Smoke Tests | | | |
| Post-Deploy Verification | | | |

---

## Appendix: Quick Reference Commands

```bash
# Check deployment status
vercel ls

# View recent logs
vercel logs --follow

# Trigger cron manually
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://useritmo.pt/api/cron/process-cadence

# Check Stripe webhook events
stripe events list --limit 10

# Database quick check
npx prisma studio
```
