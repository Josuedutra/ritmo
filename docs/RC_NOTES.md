# Release Candidate Notes

## RC Information

| Field | Value |
|-------|-------|
| **Commit SHA** | `5ddfff5887b7c9576975a9b4b63ecf031423457d` |
| **Branch** | `release-candidate` |
| **Source Branch** | `staging-hardening` |
| **Date** | 2026-01-23 |
| **Tag** | `rc-20260123-01` (optional) |

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
- **Free tier**: 5 quotes/month, no BCC inbound, scoreboard locked
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

### Modified Fields
- `trial_bcc_captures` INT (existing, used by atomic function)

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
- Stripe API 2024-12-18.acacia
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
