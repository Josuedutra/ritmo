# Cloudflare Email Worker Setup

This document describes how to set up Cloudflare Email Routing with a Worker to forward inbound emails to Ritmo.

## Prerequisites

- Cloudflare account with `useritmo.pt` domain added
- Nameservers pointing to Cloudflare
- Wrangler CLI installed: `npm install -g wrangler`

## Step 1: Enable Email Routing

1. Go to Cloudflare Dashboard → `useritmo.pt` → Email → Email Routing
2. Click "Enable Email Routing"
3. Add a destination address (your email) to verify the domain
4. Complete DNS verification if needed

## Step 2: Create the Worker

### 2.1 Initialize Worker Project

```bash
mkdir ritmo-email-worker
cd ritmo-email-worker
npm init -y
npm install wrangler --save-dev
```

### 2.2 Create wrangler.toml

```toml
name = "ritmo-email-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
WEBHOOK_URL = "https://app.useritmo.pt/api/inbound/cloudflare"

# Add secret via: wrangler secret put INBOUND_SECRET
```

### 2.3 Create src/index.ts

```typescript
import PostalMime from 'postal-mime';

interface Env {
  WEBHOOK_URL: string;
  INBOUND_SECRET: string;
}

// Generate HMAC-SHA256 signature
async function sign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    try {
      // Parse the email
      const parser = new PostalMime();
      const rawEmail = await new Response(message.raw).arrayBuffer();
      const email = await parser.parse(rawEmail);

      // Build payload
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const payload = {
        messageId: email.messageId || null,
        from: message.from,
        to: message.to,
        subject: email.subject || '',
        bodyText: email.text || '',
        bodyHtml: email.html || '',
        timestamp,
        attachments: email.attachments?.map(att => ({
          filename: att.filename || 'attachment',
          contentType: att.mimeType,
          size: att.content.byteLength,
          content: arrayBufferToBase64(att.content),
        })) || [],
      };

      const body = JSON.stringify(payload);

      // Sign the payload
      const signature = await sign(timestamp + body, env.INBOUND_SECRET);

      // Forward to webhook
      const response = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cloudflare-Signature': signature,
          'X-Cloudflare-Timestamp': timestamp,
        },
        body,
      });

      if (!response.ok) {
        console.error(`Webhook failed: ${response.status} ${await response.text()}`);
      } else {
        console.log(`Email processed: ${message.from} -> ${message.to}`);
      }
    } catch (error) {
      console.error('Email processing error:', error);
      // Don't throw - we don't want Cloudflare to retry
    }
  },
};
```

### 2.4 Install postal-mime

```bash
npm install postal-mime
```

### 2.5 Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"]
  }
}
```

### 2.6 Install types

```bash
npm install @cloudflare/workers-types --save-dev
```

## Step 3: Deploy the Worker

### 3.1 Login to Cloudflare

```bash
npx wrangler login
```

### 3.2 Generate and set the secret

Generate a secure random secret:

```bash
openssl rand -hex 32
```

Set it in the Worker:

```bash
npx wrangler secret put INBOUND_SECRET
# Paste the generated secret when prompted
```

**IMPORTANT:** Save this secret - you'll need it for Vercel.

### 3.3 Deploy

```bash
npx wrangler deploy
```

## Step 4: Configure Email Routing

1. Go to Cloudflare Dashboard → `useritmo.pt` → Email → Email Routing → Routing Rules
2. Click "Create address"
3. Configure:
   - Custom address: `*` (catch-all) or specific pattern
   - Destination: Select "Send to a Worker" → choose `ritmo-email-worker`
4. Save

For BCC capture, you need a catch-all on the `inbound` subdomain:
- Go to Email Routing → Routing Rules
- Create rule for `*@inbound.useritmo.pt` → Send to Worker

## Step 5: Add Secret to Vercel

Add the environment variable in Vercel:

```
CLOUDFLARE_INBOUND_SECRET=<the-secret-you-generated>
```

## Testing

Send a test email:

1. Send an email to `test@inbound.useritmo.pt`
2. Check Cloudflare Workers logs: Dashboard → Workers → ritmo-email-worker → Logs
3. Check Vercel logs for `/api/inbound/cloudflare`

## Troubleshooting

### Email not received by Worker
- Check Email Routing is enabled
- Verify routing rule matches the address
- Check Worker is deployed and selected as destination

### Worker errors
- Check Workers logs in Cloudflare Dashboard
- Verify INBOUND_SECRET is set correctly
- Test webhook URL is accessible

### Webhook signature invalid
- Ensure CLOUDFLARE_INBOUND_SECRET in Vercel matches INBOUND_SECRET in Worker
- Check timestamp is not too old (>5 minutes)

## Cost

- Email Routing: Free (unlimited)
- Workers: Free tier includes 100,000 requests/day
- Paid: $5 per 10 million requests after free tier
