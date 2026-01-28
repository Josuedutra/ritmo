# Release Candidate Notes

## RC Information

| Field | Value |
|-------|-------|
| **Commit SHA** | `4ce463a` |
| **Branch** | `release-candidate` |
| **Source Branch** | `main` |
| **Date** | 2026-01-27 |
| **Tag** | `rc-20260127` |

---

## Features Included

### 1. Trial AHA Moment System
- **First BCC Capture Celebration**: When a trial user captures their first proposal via BCC inbound, they see:
  - Toast notification: "Captura concluída"
  - Scoreboard highlight ring (brand color, 1500ms)
  - Timestamp recorded: `ahaFirstBccCaptureAt`
- **Single-fire**: Uses localStorage to prevent repeat celebrations
- **Atomic increment**: `checkAndIncrementTrialBccCapture()` prevents race conditions

### 2. Onboarding Premium Polish
- SMTP default: "Enviar via Ritmo" with "Recomendado" badge
- "SMTP próprio" blocks advancement without config
- Premium copy (PT-PT, no emojis)
- Gradient CTA only on primary buttons

### 3. Entitlements Hardening
- **Free tier**: 10 quotes/month, no BCC inbound, scoreboard locked
- **Trial tier**: 20 quotes, 1 BCC capture, scoreboard ON, 14 days
- **Paid tiers**: Unlimited BCC captures, full scoreboard, automation

### 4. Brand Token System
- Added `--color-brand` CSS custom property
- Replaces hardcoded blue-500 with brand color for highlight rings
- Consistent styling across celebration UI

### 5. Billing/Stripe Hardening
- `PAYMENTS_ENABLED=false` returns 503 with clear messaging
- Webhook idempotency with StripeEvent status tracking
- Stale processing recovery (5-minute timeout)

### 6. Premium System Pages (NEW in 9420a5c)
- **SystemPageLayout**: Reusable premium centered card layout for system pages
- **/billing/success**: Checkout success page with Stripe session verification
  - Calls `/api/billing/verify` to confirm payment
  - Shows subscription summary (plan, price, next billing date)
  - Loading, success, and error states
  - **Slow confirmation fallback (30s)**: If verification takes >30s, shows reassuring message with CTAs (only when valid session_id exists)
- **/billing/cancel**: Checkout cancelled page with clear "nenhuma cobrança" messaging
- **SignOut UX**: Redirects to landing page with "Sessão terminada" toast

### 7. StatusBadge Component (NEW in 9420a5c)
- Reusable status indicator with 7 states: `active`, `pending`, `verified`, `limited`, `disabled`, `info`, `warning`
- PT-PT labels with appropriate icons and colors
- Integrated in onboarding:
  - Step 4 (BCC): Shows dynamic BCC capture status
  - Step 5 (Summary): Displays BCC status in configuration summary
- Status logic based on entitlements:
  - `disabled`: BCC inbound not enabled
  - `limited`: Trial BCC limit reached
  - `pending`: Verification in progress
  - `verified`: Capture confirmed
  - `active`: Default ready state

### 8. API Endpoint: /api/billing/verify
- Verifies Stripe checkout session by session_id
- Returns subscription details for success page
- Lazy Stripe initialization (build-safe)

### 9. Annual Pricing + Starter Seat Add-on (NEW)
- **Annual billing toggle**: Monthly/Annual switch on billing page with "2 meses grátis" badge
  - Starter annual: €32/mês (€390/ano, ~17% discount)
  - Pro annual: €82/mês (€990/ano, ~17% discount)
  - Graceful degradation: returns 503 `ANNUAL_NOT_AVAILABLE` if annual price IDs not configured
- **Extra seat add-on (Starter only)**: +€15/mês per extra seat via Stripe multi-line_item checkout
  - Stepper UI on billing page (0-10 seats)
  - Entitlements: `maxUsers = plan.maxUsers + extraSeats`
- **Free plan limit increase**: 5 → 10 quotes/month
- **Schema changes**: `Plan.stripePriceIdAnnual`, `Subscription.billingInterval`, `Subscription.extraSeats`
- **Webhook hardening**: Extracts billing interval + seat count from Stripe subscription items, filters addon items from plan resolution
- **Landing page pricing section**: Annual toggle with strikethrough prices, "+1 utilizador extra por €15/mês" copy, cost-of-inaction copy

---

## Security Changes

### Password Handling
- All new passwords hashed with bcrypt (`$2` prefix)
- Legacy plaintext passwords auto-upgraded on login
- No plaintext storage ever

### Password Reset Flow
- Anti-enumeration: identical responses for existing/non-existing emails
- Rate limiting: 60s cooldown per email, 5 requests/hour max
- Token expiration: 1 hour
- Token consumed after use

### Session Security
- Sessions invalidated on password change
- CSRF protection via NextAuth

---

## Database Migrations

### New Fields (Organization)
```sql
aha_first_bcc_capture    BOOLEAN DEFAULT false
aha_first_bcc_capture_at TIMESTAMP
```

### New Fields (Plan)
```sql
stripe_price_id_annual  TEXT  -- Annual Stripe price ID
```

### New Fields (Subscription)
```sql
billing_interval  TEXT DEFAULT 'monthly'  -- "monthly" | "annual"
extra_seats       INT  DEFAULT 0          -- Starter seat add-on quantity
```

### Modified Fields
- `trial_bcc_captures` INT (existing, used by atomic function)

### InboundIngestion: Provider Enum + Composite Idempotency + Cockpit Indexes

#### Enum Migration
```sql
-- Create InboundProvider enum type
CREATE TYPE "InboundProvider" AS ENUM ('cloudflare', 'mailgun');

-- Convert provider column from text to enum
ALTER TABLE inbound_ingestions
  ALTER COLUMN provider TYPE "InboundProvider" USING provider::"InboundProvider";
ALTER TABLE inbound_ingestions
  ALTER COLUMN provider SET DEFAULT 'cloudflare'::"InboundProvider";
```
- **Pre-migrate steps:** Backfill orphaned stubs → sanitize invalid values → create enum → convert column
- **Idempotent:** All steps use `IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object` guards

#### Composite Unique Constraint
```sql
-- Old: global unique on provider_message_id (dropped)
DROP INDEX IF EXISTS "inbound_ingestions_provider_message_id_key";
DROP INDEX IF EXISTS "inbound_ingestions_provider_message_id_idx";

-- New: composite unique (provider + provider_message_id)
@@unique([provider, providerMessageId])
```
- **Reason:** Same `providerMessageId` from different providers (Cloudflare vs Mailgun) should not collide
- **Idempotency lookups updated:** Cloudflare + Mailgun routes use `provider_providerMessageId` composite key

#### Cockpit Performance Indexes
```sql
-- Cockpit reply-signal queries (quote-scoped)
@@index([quoteId, status, receivedAt])

-- Cockpit org-level queries
@@index([organizationId, status, receivedAt])
```

- **Applied by:** `pre-migrate.ts` (enum + index changes) then `prisma db push`
- **Risk:** Low — additive indexes, enum conversion is safe with pre-sanitization

---

## Known Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Race condition on BCC capture | Low | Low | Atomic UPDATE pattern in `checkAndIncrementTrialBccCapture()` |
| localStorage not available | Low | None | Silent fallback, celebration still works server-side |
| Stripe webhook replay | Low | None | Idempotency via StripeEvent status |
| Trial expiration mid-session | Low | Low | Entitlements checked on each request |

---

## Rollback Instructions

### Quick Rollback (Feature Flags)
1. Set `NEXT_PUBLIC_PAYMENTS_ENABLED=false` to disable billing
2. Celebration hook degrades gracefully (no toast, no highlight)

### Full Rollback
1. Revert to previous deployment in Vercel
2. Database: No schema rollback needed (new fields are nullable/default)
3. Environment variables: No changes needed

### Critical Rollback (if data corruption)
1. Contact Neon for point-in-time recovery
2. Restore from backup (< 24h RPO)

---

## Dependencies

- Prisma 6.19.2
- Next.js 16.1.3
- Stripe API 2025-02-24.acacia
- Neon PostgreSQL

---

## Testing Checklist Reference

See `docs/STAGING_APPROVAL.md` for complete QA checklist (78 test cases).

---

## Contacts

| Role | Contact |
|------|---------|
| Tech Lead | josue@antigravity.pt |
| On-call | #ritmo-alerts (Slack) |
