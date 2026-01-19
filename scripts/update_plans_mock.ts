
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLANS = {
    starter: { price: 2900, stripeId: "price_mock_starter" },
    pro: { price: 7900, stripeId: "price_mock_pro" },
    enterprise: { price: 19900, stripeId: "price_mock_enterprise" },
};

async function main() {
    console.log("🛠 Updating plans with Mock Stripe IDs...");

    for (const [id, data] of Object.entries(PLANS)) {
        await prisma.plan.update({
            where: { id },
            data: {
                stripePriceId: data.stripeId,
            },
        });
        console.log(`✅ Updated ${id} with stripePriceId=${data.stripeId}`);
    }

    console.log("🎉 Plans updated!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
