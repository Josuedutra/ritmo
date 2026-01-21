const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany({
        orderBy: { priceMonthly: "asc" },
    });

    console.log("\n📊 All Plans:\n");
    plans.forEach((p) => {
        const price = p.priceMonthly === 0 ? "Free" : `€${p.priceMonthly / 100}/mo`;
        const priceType = !p.stripePriceId
            ? "NO_PRICE"
            : p.stripePriceId.includes("mock")
              ? "MOCK"
              : "LIVE";
        console.log(
            `${p.id.padEnd(12)} | ${p.name.padEnd(12)} | ${price.padEnd(10)} | ${(p.stripePriceId || "null").padEnd(25)} | ${priceType.padEnd(8)} | Active:${p.isActive} Public:${p.isPublic}`
        );
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
