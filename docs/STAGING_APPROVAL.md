# Staging Approval Report

## Environment

| Field | Value |
|-------|-------|
| **Staging URL** | `https://staging.useritmo.pt` |
| **Commit SHA** | _TO BE FILLED_ |
| **Branch** | `staging-hardening` |
| **Date** | _TO BE FILLED_ |
| **Tester** | _TO BE FILLED_ |

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

## 5. Inbound Email Tests

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
| Inbound Email | _/4_ | _/4_ | _/4_ |
| Cron Jobs | _/3_ | _/3_ | _/3_ |
| **TOTAL** | _/40_ | _/40_ | _/40_ |

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
