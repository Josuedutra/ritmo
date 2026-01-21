-- ============================================================================
-- Stripe Live Price IDs Update Script
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Create products in Stripe Dashboard (Live mode):
--    - Starter: €39/month recurring
--    - Pro: €99/month recurring
--
-- 2. Copy the price IDs (format: price_1Abc...)
--
-- 3. Replace the placeholders below with your actual Live price IDs
--
-- 4. Run this SQL in your Neon/Supabase SQL editor
-- ============================================================================

-- STEP 1: Update Starter price ID
-- Replace 'price_PASTE_STARTER_ID_HERE' with your actual Starter price ID
UPDATE "Plan"
SET "stripePriceId" = 'price_PASTE_STARTER_ID_HERE'
WHERE id = 'starter';

-- STEP 2: Update Pro price ID
-- Replace 'price_PASTE_PRO_ID_HERE' with your actual Pro price ID
UPDATE "Plan"
SET "stripePriceId" = 'price_PASTE_PRO_ID_HERE'
WHERE id = 'pro';

-- ============================================================================
-- VERIFICATION QUERY (run after updates)
-- ============================================================================
SELECT
    id,
    name,
    "stripePriceId",
    "priceMonthly" / 100 as "price_eur",
    "isActive",
    "isPublic"
FROM "Plan"
ORDER BY "priceMonthly";

-- Expected output:
-- | id         | name       | stripePriceId          | price_eur | isActive | isPublic |
-- |------------|------------|------------------------|-----------|----------|----------|
-- | free       | Gratuito   | null                   | 0         | true     | true     |
-- | enterprise | Enterprise | price_mock_enterprise  | 0         | false    | false    |
-- | starter    | Starter    | price_1Abc...          | 39        | true     | true     |
-- | pro        | Pro        | price_1Xyz...          | 99        | true     | true     |
-- | pro_plus   | Pro+       | null                   | 149       | true     | false    |

-- ============================================================================
-- PRODUCTION CHECKLIST
-- ============================================================================
-- After running this script, ensure:
--
-- 1. Vercel Environment Variables:
--    - STRIPE_SECRET_KEY=sk_live_...
--    - STRIPE_WEBHOOK_SECRET=whsec_...
--    - NEXTAUTH_URL=https://app.useritmo.pt
--
-- 2. Stripe Dashboard Configuration:
--    - Webhook URL: https://app.useritmo.pt/api/webhooks/stripe
--    - Events: checkout.session.completed, customer.subscription.*, invoice.*
--    - Customer Portal enabled with return URL: https://app.useritmo.pt/settings/billing
--
-- 3. Test Flow:
--    - Login as admin → /settings/billing → Click "Escolher plano"
--    - Complete Stripe Checkout → Verify subscription updated
--    - Click "Gerir subscrição" → Verify Customer Portal opens
