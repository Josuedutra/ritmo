
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const plans = await prisma.plan.findMany();
    console.log("Plans found:", plans);

    if (plans.length === 0) {
        console.log("⚠️ No plans found in database!");
    } else {
        console.log(`✅ Found ${plans.length} plans.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
