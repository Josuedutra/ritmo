# Staging Environment Setup

## Overview

This document describes how to configure the staging environment for Ritmo before go-live.

## Prerequisites

- Vercel project configured with staging branch
- Neon database (staging branch)
- Stripe account with test keys
- Resend account
- Supabase storage bucket
- Cloudflare account for email routing

## Environment Variables

Copy these to your Vercel staging environment:

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="https://staging.useritmo.pt"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Cron
CRON_SECRET="<generate with: openssl rand -hex 32>"

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="Ritmo <noreply@useritmo.pt>"

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."

# Billing (Stripe TEST keys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STARTER="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_PRO_PLUS="price_..."

# Inbound Email (Cloudflare)
INBOUND_SECRET="<generate with: openssl rand -hex 32>"

# Ops
OPS_TOKEN="<generate with: openssl rand -hex 32>"
ADMIN_EMAILS="admin@useritmo.pt"

# Observability
SENTRY_DSN="..."
NEXT_PUBLIC_SENTRY_DSN="..."
SENTRY_ENVIRONMENT="staging"
NEXT_PUBLIC_SENTRY_ENVIRONMENT="staging"
```

### Feature Flags

```bash
# IMPORTANT: Keep payments disabled until Stripe Live is configured
NEXT_PUBLIC_PAYMENTS_ENABLED="false"

# Show demo credentials on login (optional for testing)
NEXT_PUBLIC_SHOW_DEMO="true"

# Easter holidays calculation
INCLUDE_EASTER_HOLIDAYS="true"
```

## Database Setup

### 1. Create Staging Branch (Neon)

```bash
# In Neon console, create a new branch from production or main
# Copy the connection string to DATABASE_URL
```

### 2. Run Migrations

```bash
# Apply schema
npx prisma db push

# Run pre-migration fixes (if needed)
npx tsx prisma/pre-migrate.ts

# Seed initial data
npx prisma db seed
```

## Stripe Configuration

### 1. Create Products and Prices (Test Mode)

Create the following products in Stripe Dashboard (Test Mode):

| Plan    | Price    | Price ID                      |
|---------|----------|-------------------------------|
| Starter | €39/mês  | Copy to STRIPE_PRICE_STARTER |
| Pro     | €99/mês  | Copy to STRIPE_PRICE_PRO     |
| Pro+    | €149/mês | Copy to STRIPE_PRICE_PRO_PLUS |

### 2. Configure Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://staging.useritmo.pt/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Cloudflare Email Setup

### 1. Configure Email Routing

1. Enable Email Routing for `inbound.useritmo.pt`
2. Create a Catch-all rule pointing to the Worker `ritmo-email-worker`

### 2. Configure Worker Variables

In Cloudflare Dashboard > Workers > ritmo-email-worker > Settings > Variables:

```
WEBHOOK_URL = https://staging.useritmo.pt/api/inbound/cloudflare
INBOUND_SECRET = <same as Vercel INBOUND_SECRET>
```

## Cron Jobs (Vercel)

Configure in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-cadence",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/calculate-metrics",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/purge-proposals",
      "schedule": "0 4 * * *"
    }
  ]
}
```

## Security Checklist

- [ ] All secrets are unique (not copied from production)
- [ ] `NEXT_PUBLIC_PAYMENTS_ENABLED="false"` until Stripe Live ready
- [ ] Stripe in TEST mode (not Live)
- [ ] Rate limiting configured
- [ ] Sentry DSN points to staging project
- [ ] Password reset has rate limit per IP and per email (5/hour, 60s cooldown)
- [ ] Stripe webhook uses claim pattern with retry support (PROCESSING/PROCESSED/FAILED states)

## Testing Checklist

### Auth
- [ ] Email/password login works
- [ ] Google OAuth works
- [ ] Password reset flow works
  - [ ] Request reset for existing email → email received
  - [ ] Request reset for non-existing email → same response (anti-enumeration)
  - [ ] Request reset twice quickly → second request silently ignored (cooldown)
  - [ ] Reset with valid token → password updated, forced re-login
  - [ ] Reset with expired/invalid token → error message
- [ ] Legacy plaintext password auto-upgraded to bcrypt on login
- [ ] Session persists correctly

### Billing
- [ ] "Pagamentos em breve" banner shows on billing page (when PAYMENTS_ENABLED=false)
- [ ] Clicking upgrade shows toast "Pagamentos em breve" (when PAYMENTS_ENABLED=false)
- [ ] Billing page displays only public plans (free, starter, pro)
- [ ] pro_plus and enterprise NOT visible in plan list
- [ ] (After enabling payments) Checkout flow works with test card

### Stripe Webhook
- [ ] Valid webhook signature → processed
- [ ] Invalid signature → 400
- [ ] Same event sent twice → first processes, second returns `{duplicate: true}`
- [ ] Event processing fails → status=FAILED, Stripe retry succeeds
- [ ] Check stripe_events table has PROCESSING/PROCESSED/FAILED status

### Inbound Email
- [ ] Send email to `all+test+xxx@inbound.useritmo.pt`
- [ ] Verify webhook receives the email
- [ ] PDF attachment is processed correctly

### Cron
- [ ] Cadence emails are sent at correct times
- [ ] Metrics calculation runs
- [ ] Proposal purge runs

## Go-Live Checklist

When ready to enable payments:

1. Configure Stripe Live keys
2. Create Live products/prices
3. Configure Live webhook
4. Set `NEXT_PUBLIC_PAYMENTS_ENABLED="true"`
5. Test checkout flow with real card
6. Monitor Sentry and Stripe dashboard

## Rollback

If issues occur:

1. Revert to previous deployment in Vercel
2. Set `NEXT_PUBLIC_PAYMENTS_ENABLED="false"` if payment issues
3. Check Sentry for error details
4. Review logs in Vercel dashboard
