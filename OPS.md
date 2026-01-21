# Ritmo Operations Guide

This document covers the observability and operations setup for Ritmo.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Sentry Error Tracking](#sentry-error-tracking)
3. [Request ID Correlation](#request-id-correlation)
4. [Ops Endpoints](#ops-endpoints)
5. [Uptime Monitoring](#uptime-monitoring)
6. [Admin Ops Dashboard](#admin-ops-dashboard)
7. [Alert Thresholds](#alert-thresholds)
8. [Runbook](#runbook)

---

## Environment Variables

Add these to your `.env.local` or Vercel environment:

```bash
# Sentry
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
SENTRY_ENVIRONMENT="production"
NEXT_PUBLIC_SENTRY_ENVIRONMENT="production"

# Ops endpoints protection
OPS_TOKEN="<generate with: openssl rand -hex 32>"

# Admin access (comma-separated emails)
ADMIN_EMAILS="admin@example.com,ops@example.com"
```

For GitHub Actions (repository secrets):

```
OPS_TOKEN          - Same as above
RESEND_API_KEY     - Resend API key for email alerts
ALERT_EMAIL        - Email to receive alerts
PRODUCTION_URL     - Base URL (e.g., https://app.ritmo.pt)
```

---

## Sentry Error Tracking

### Setup

Sentry is configured with PII scrubbing to protect user data:

- **Emails**: Masked (e.g., `j***@example.com`)
- **Tokens**: Redacted (bearer tokens, API keys, JWTs)
- **Headers**: Sensitive headers (Authorization, Cookie) are scrubbed
- **IP addresses**: Removed

### Files

- `sentry.client.config.ts` - Browser configuration
- `sentry.server.config.ts` - Node.js server configuration
- `sentry.edge.config.ts` - Edge runtime configuration
- `src/lib/observability/sentry-scrub.ts` - PII scrubbing logic

### Usage

Sentry automatically captures:
- Unhandled exceptions
- Unhandled promise rejections
- Console errors (in production)

To manually capture errors:

```typescript
import * as Sentry from "@sentry/nextjs";

try {
    // risky operation
} catch (error) {
    Sentry.captureException(error, {
        tags: { feature: "billing" },
        extra: { userId: "..." },
    });
}
```

### Using Sentry Context in API Routes

Use the helper functions to set Sentry context with request ID correlation:

```typescript
import { setSentryRequestContext, captureError } from "@/lib/observability/sentry-context";

export async function POST(request: NextRequest) {
    // Set request context at the start of the handler
    setSentryRequestContext(request);

    try {
        // ... handler logic
    } catch (error) {
        // Capture with context
        captureError(error, {
            requestId: await getRequestId(),
            organizationId: session.user.organizationId,
            extra: { quoteId: "..." },
        });
        throw error;
    }
}
```

### Smoke Test Endpoint

Verify Sentry is working with the smoke test endpoint (requires ADMIN_EMAILS session):

```bash
# Access via browser while logged in as admin, or use session cookie
curl https://app.ritmo.pt/api/admin/sentry-test
```

Response:
```json
{
    "ok": true,
    "requestId": "rid_xxx",
    "sentryEventId": "abc123...",
    "message": "Test event sent to Sentry. Check your Sentry dashboard."
}
```

---

## Request ID Correlation

Every request gets a unique `x-request-id` header for correlation across:
- Application logs (pino)
- Sentry events
- Response headers

### How it works

1. Middleware checks for existing `x-request-id` header
2. If not present, generates one: `rid_<timestamp>_<random>`
3. Header is propagated to downstream services and response

### Using in API routes

```typescript
import { getRequestId, setRequestIdOnSentry } from "@/lib/observability/request-id";

export async function GET(request: NextRequest) {
    const requestId = await getRequestId();
    setRequestIdOnSentry(requestId);

    // Use in logs
    log.info({ requestId }, "Processing request");
}
```

---

## Ops Endpoints

Protected endpoints for health monitoring. Require `x-ops-token` header.

### GET /api/ops/metrics

Aggregated health metrics with alert status.

```bash
curl -H "x-ops-token: $OPS_TOKEN" https://app.ritmo.pt/api/ops/metrics
```

Response:
```json
{
    "healthy": true,
    "requestId": "rid_xxx",
    "timestamp": "2024-01-15T10:00:00Z",
    "alerts": [],
    "metrics": {
        "inbound": { "total24h": 100, "rejectionRate": 5 },
        "stripe": { "total24h": 50, "failed24h": 0 },
        "cron": { "pendingPurge": 10, "isStale": false }
    }
}
```

### GET /api/ops/cron

Cron job health status.

```bash
curl -H "x-ops-token: $OPS_TOKEN" https://app.ritmo.pt/api/ops/cron
```

### GET /api/ops/inbound

Inbound email processing health.

```bash
curl -H "x-ops-token: $OPS_TOKEN" https://app.ritmo.pt/api/ops/inbound
```

### GET /api/ops/stripe

Stripe webhook processing health.

```bash
curl -H "x-ops-token: $OPS_TOKEN" https://app.ritmo.pt/api/ops/stripe
```

---

## Uptime Monitoring

GitHub Actions workflow runs every 5 minutes.

### File: `.github/workflows/uptime.yml`

### What it does

1. Calls `/api/ops/metrics` endpoint
2. Checks `healthy` field
3. If unhealthy, sends email alert via Resend

### Manual trigger

Go to Actions > Uptime Monitor > Run workflow

### Alert email format

Subject: `⚠️ Ritmo: Health check failed`

Body includes:
- Active alerts with codes and messages
- Full metrics response
- Timestamp and workflow ID

---

## Admin Ops Dashboard

Access at `/admin/ops` (requires ADMIN_EMAILS).

### Features

- Real-time health status banner
- Inbound email metrics (24h)
- Stripe webhook metrics (24h)
- Cron job status
- Alert threshold reference

### Usage

1. Navigate to `/admin/ops`
2. Enter OPS_TOKEN in the input field
3. Click "Refresh" to load data
4. Dashboard auto-refreshes every 30 seconds

---

## Alert Thresholds

| Alert Code | Condition | Action |
|------------|-----------|--------|
| `INBOUND_REJECTION_HIGH` | Rejection rate > 25% (min 5 events) | Check Mailgun signature, quota |
| `STRIPE_FAILURES` | Any failed webhook | Check Stripe logs, webhook secret |
| `CRON_BACKLOG` | Pending purge > 1000 | Check cron job, run manually |
| `CRON_STALE` | No purge in 48h + pending > 0 | Check Vercel cron, CRON_SECRET |

---

## Runbook

### INBOUND_REJECTION_HIGH

1. Check `/api/ops/inbound` for rejection reasons
2. Common causes:
   - `SIGNATURE_INVALID`: Check MAILGUN_SIGNING_KEY
   - `QUOTA_EXCEEDED`: Customer over storage limit
   - `BCC_INVALID`: Malformed BCC address
3. Check Mailgun dashboard for delivery issues

### STRIPE_FAILURES

1. Check `/api/ops/stripe` for recent failures
2. Check Stripe Dashboard > Developers > Webhooks
3. Common causes:
   - `SIGNATURE_INVALID`: Check STRIPE_WEBHOOK_SECRET
   - `ORG_NOT_FOUND`: Customer org deleted/missing
4. Retry failed webhooks from Stripe dashboard

### CRON_BACKLOG

1. Check Vercel dashboard for cron job status
2. Run manual purge:
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://app.ritmo.pt/api/cron/purge-proposals
   ```
3. Check logs for errors

### CRON_STALE

1. Check Vercel cron configuration in vercel.json
2. Verify CRON_SECRET is set
3. Check Vercel Functions logs
4. Run manual trigger (see above)

### Sentry Alert

1. Go to Sentry dashboard
2. Check error details and stack trace
3. Look for `request_id` tag for correlation
4. Search logs with: `grep "rid_xxx" logs`

---

## Maintenance

### Rotating OPS_TOKEN

1. Generate new token: `openssl rand -hex 32`
2. Update in Vercel environment
3. Update in GitHub repository secrets
4. Trigger deployment

### Adding new alerts

1. Edit `src/app/api/ops/metrics/route.ts`
2. Add new threshold to `THRESHOLDS` object
3. Add alert check logic
4. Update this documentation
