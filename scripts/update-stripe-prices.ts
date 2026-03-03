/**
 * Script: Update Stripe Live Price IDs
 *
 * Usage:
 *   npx tsx scripts/update-stripe-prices.ts
 *
 * This script updates the Plan table with Live Stripe price IDs.
 * Run this AFTER creating the products/prices in Stripe Dashboard (Live mode).
 *
 * Prerequisites:
 * 1. Create products in Stripe Dashboard (Live mode):
 *    - Starter: €39/month
 *    - Pro: €99/month
 * 2. Copy the price IDs (price_1Abc...) and paste below
 * 3. Run this script
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// PASTE YOUR LIVE STRIPE PRICE IDs HERE
// ============================================================================
const LIVE_PRICE_IDS = {
  starter: "", // e.g., "price_1QxYz..."
  pro: "", // e.g., "price_1AbCd..."
};
// ============================================================================

async function main() {
  console.log("\n🔧 Stripe Live Price ID Updater\n");
  console.log("=".repeat(50));

  // Validate price IDs
  const errors: string[] = [];

  if (!LIVE_PRICE_IDS.starter) {
    errors.push("❌ Missing Starter price ID");
  } else if (!LIVE_PRICE_IDS.starter.startsWith("price_")) {
    errors.push(`❌ Invalid Starter price ID format: ${LIVE_PRICE_IDS.starter}`);
  }

  if (!LIVE_PRICE_IDS.pro) {
    errors.push("❌ Missing Pro price ID");
  } else if (!LIVE_PRICE_IDS.pro.startsWith("price_")) {
    errors.push(`❌ Invalid Pro price ID format: ${LIVE_PRICE_IDS.pro}`);
  }

  if (errors.length > 0) {
    console.log("\n⚠️  Validation Errors:\n");
    errors.forEach((e) => console.log("  " + e));
    console.log("\n📝 Instructions:");
    console.log("  1. Open Stripe Dashboard (Live mode)");
    console.log("  2. Go to Products → Create product");
    console.log("  3. Create Starter (€39/mo) and Pro (€99/mo)");
    console.log("  4. Copy the price_xxx IDs");
    console.log("  5. Paste them in LIVE_PRICE_IDS above");
    console.log("  6. Run this script again\n");
    process.exit(1);
  }

  // Show current state
  console.log("\n📊 Current Plan State:\n");
  const currentPlans = await prisma.plan.findMany({
    where: { id: { in: ["starter", "pro"] } },
    select: {
      id: true,
      name: true,
      stripePriceId: true,
      priceMonthly: true,
      isActive: true,
      isPublic: true,
    },
    orderBy: { priceMonthly: "asc" },
  });

  currentPlans.forEach((p) => {
    const status = p.stripePriceId?.startsWith("price_mock") ? "⚠️  MOCK" : "✅ LIVE";
    console.log(`  ${p.name}: ${p.stripePriceId || "null"} ${status}`);
  });

  // Confirm update
  console.log("\n🔄 Will update to:\n");
  console.log(`  Starter: ${LIVE_PRICE_IDS.starter}`);
  console.log(`  Pro: ${LIVE_PRICE_IDS.pro}`);

  // Perform updates
  console.log("\n⏳ Updating...\n");

  const starterUpdate = await prisma.plan.update({
    where: { id: "starter" },
    data: { stripePriceId: LIVE_PRICE_IDS.starter },
  });

  const proUpdate = await prisma.plan.update({
    where: { id: "pro" },
    data: { stripePriceId: LIVE_PRICE_IDS.pro },
  });

  console.log(`  ✅ Starter updated: ${starterUpdate.stripePriceId}`);
  console.log(`  ✅ Pro updated: ${proUpdate.stripePriceId}`);

  // Verify final state
  console.log("\n📋 Final Verification:\n");
  const updatedPlans = await prisma.plan.findMany({
    where: { id: { in: ["free", "starter", "pro", "pro_plus", "enterprise"] } },
    select: {
      id: true,
      name: true,
      stripePriceId: true,
      priceMonthly: true,
      isActive: true,
      isPublic: true,
    },
    orderBy: { priceMonthly: "asc" },
  });

  console.log(
    "  ID          | Name       | Price    | stripePriceId              | Active | Public"
  );
  console.log("  " + "-".repeat(90));
  updatedPlans.forEach((p) => {
    const price = p.priceMonthly === 0 ? "Free" : `€${p.priceMonthly / 100}/mo`;
    const priceId = p.stripePriceId || "null";
    console.log(
      `  ${p.id.padEnd(11)} | ${p.name.padEnd(10)} | ${price.padEnd(8)} | ${priceId.padEnd(26)} | ${p.isActive ? "✅" : "❌"}      | ${p.isPublic ? "✅" : "❌"}`
    );
  });

  console.log("\n✅ Done! Stripe Live prices are now configured.\n");
  console.log("📝 Next steps:");
  console.log("  1. Set STRIPE_SECRET_KEY=sk_live_... in Vercel");
  console.log("  2. Set STRIPE_WEBHOOK_SECRET=whsec_... in Vercel");
  console.log("  3. Configure webhook: https://app.useritmo.pt/api/webhooks/stripe");
  console.log("  4. Test checkout flow\n");
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
