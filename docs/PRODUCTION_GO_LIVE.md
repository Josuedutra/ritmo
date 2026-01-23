# Production Go-Live Plan

## Overview

| Field | Value |
|-------|-------|
| **RC Commit** | `5ddfff5887b7c9576975a9b4b63ecf031423457d` |
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

**Required Events:**
- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
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

```bash
# Option A: Vercel CLI
vercel --prod

# Option B: Git push (if auto-deploy configured)
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

### 5.4 Billing (Critical)

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Billing page | Visit `/settings/billing` | Shows plans | [ ] |
| Starter checkout | Click upgrade | Stripe Checkout opens | [ ] |
| **STOP HERE** | Do NOT complete checkout | | |

> **Note**: Complete checkout test only if you have a test account or are prepared to refund.

### 5.5 Webhook Health

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Ops endpoint | `curl -H "Authorization: Bearer $OPS_TOKEN" https://useritmo.pt/api/ops/stripe` | Returns webhook status | [ ] |

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

### Scenario A: Minor Issues (Non-Blocking)

1. Create GitHub issue with P1 label
2. Continue monitoring
3. Fix in next deploy

### Scenario B: Billing Failure

1. Set `NEXT_PUBLIC_PAYMENTS_ENABLED=false` in Vercel
2. Redeploy (automatic with env change)
3. Users see "Pagamentos em breve" message
4. Investigate and fix
5. Re-enable payments

### Scenario C: Critical Failure (App Down)

1. Rollback to previous deployment in Vercel
   - Go to Vercel > Deployments
   - Find last good deployment
   - Click "..." > "Promote to Production"
2. Notify team in #ritmo-alerts
3. Investigate root cause

### Scenario D: Data Corruption

1. Contact Neon support for point-in-time recovery
2. Restore from backup (RPO < 24h)
3. Redeploy with fixes

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
