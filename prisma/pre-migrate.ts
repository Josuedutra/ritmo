/**
 * Pre-migration script to handle schema changes that require data backfill
 *
 * Run this BEFORE prisma db push when adding required columns to existing tables
 *
 * Usage: npx tsx prisma/pre-migrate.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🔄 Running pre-migration fixes...");

    // Check if organizations table exists and has rows
    const orgCount = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_name = 'organizations'
    `;

    if (orgCount[0]?.count > 0) {
        // Check if short_id column exists
        const columnExists = await prisma.$queryRaw<{ exists: boolean }[]>`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'organizations' AND column_name = 'short_id'
            ) as exists
        `;

        if (!columnExists[0]?.exists) {
            console.log("📝 Adding short_id column to organizations...");

            // Add column as nullable first
            await prisma.$executeRaw`
                ALTER TABLE organizations
                ADD COLUMN IF NOT EXISTS short_id TEXT
            `;

            // Populate with cuid-like values
            await prisma.$executeRaw`
                UPDATE organizations
                SET short_id = CONCAT('c', SUBSTRING(MD5(RANDOM()::TEXT), 1, 24))
                WHERE short_id IS NULL
            `;

            // Add unique constraint
            await prisma.$executeRaw`
                ALTER TABLE organizations
                ADD CONSTRAINT organizations_short_id_key UNIQUE (short_id)
            `;

            // Make it NOT NULL
            await prisma.$executeRaw`
                ALTER TABLE organizations
                ALTER COLUMN short_id SET NOT NULL
            `;

            console.log("✅ short_id column added and populated");
        } else {
            // Column exists, just ensure no nulls
            const nullCount = await prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*) as count FROM organizations WHERE short_id IS NULL
            `;

            if (nullCount[0]?.count > 0n) {
                console.log("📝 Populating NULL short_id values...");
                await prisma.$executeRaw`
                    UPDATE organizations
                    SET short_id = CONCAT('c', SUBSTRING(MD5(RANDOM()::TEXT), 1, 24))
                    WHERE short_id IS NULL
                `;
                console.log("✅ short_id values populated");
            } else {
                console.log("✅ short_id column already populated");
            }
        }
    }

    console.log("✅ Pre-migration complete");
}

main()
    .catch((e) => {
        console.error("❌ Pre-migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
