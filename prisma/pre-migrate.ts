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

            if (Number(nullCount[0]?.count) > 0) {
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

    // Helper to check if table exists
    async function tableExists(tableName: string): Promise<boolean> {
        const result = await prisma.$queryRaw<{ exists: boolean }[]>`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = ${tableName}
            ) as exists
        `;
        return result[0]?.exists ?? false;
    }

    // Helper to check if column exists
    async function columnExists(
        tableName: string,
        columnName: string
    ): Promise<boolean> {
        const result = await prisma.$queryRaw<{ exists: boolean }[]>`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ${tableName} AND column_name = ${columnName}
            ) as exists
        `;
        return result[0]?.exists ?? false;
    }

    // Clean up duplicate cadence_event_id in email_logs (keep first, delete rest)
    if (
        (await tableExists("email_logs")) &&
        (await columnExists("email_logs", "cadence_event_id"))
    ) {
        console.log(
            "🧹 Cleaning up duplicate email_logs for unique constraint..."
        );
        await prisma.$executeRaw`
            DELETE FROM email_logs
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY cadence_event_id ORDER BY created_at) as rn
                    FROM email_logs
                    WHERE cadence_event_id IS NOT NULL
                ) t WHERE rn > 1
            )
        `;
    }

    // Clean up duplicate cadence_event_id in tasks (keep first, delete rest)
    if (
        (await tableExists("tasks")) &&
        (await columnExists("tasks", "cadence_event_id"))
    ) {
        console.log("🧹 Cleaning up duplicate tasks for unique constraint...");
        await prisma.$executeRaw`
            DELETE FROM tasks
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY cadence_event_id ORDER BY created_at) as rn
                    FROM tasks
                    WHERE cadence_event_id IS NOT NULL
                ) t WHERE rn > 1
            )
        `;
    }

    // Clean up duplicate provider_message_id in inbound_ingestions (keep first, delete rest)
    if (
        (await tableExists("inbound_ingestions")) &&
        (await columnExists("inbound_ingestions", "provider_message_id"))
    ) {
        console.log(
            "🧹 Cleaning up duplicate inbound_ingestions for unique constraint..."
        );
        await prisma.$executeRaw`
            DELETE FROM inbound_ingestions
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY provider_message_id ORDER BY created_at) as rn
                    FROM inbound_ingestions
                    WHERE provider_message_id IS NOT NULL
                ) t WHERE rn > 1
            )
        `;
    }

    // Ensure unique public_id in quotes (regenerate duplicates)
    if (
        (await tableExists("quotes")) &&
        (await columnExists("quotes", "public_id"))
    ) {
        console.log("🧹 Fixing duplicate public_id in quotes...");
        await prisma.$executeRaw`
            UPDATE quotes
            SET public_id = CONCAT('c', SUBSTRING(MD5(RANDOM()::TEXT || id), 1, 24))
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY public_id ORDER BY created_at) as rn
                    FROM quotes
                ) t WHERE rn > 1
            )
        `;
    }

    // Fix contacts with non-UUID IDs (like 'sample-contact-1')
    if (await tableExists("contacts")) {
        console.log("🔧 Fixing contacts with non-UUID IDs...");
        // Update contacts with invalid UUIDs to have valid UUIDs
        // This uses a regex pattern to identify non-UUID strings
        await prisma.$executeRaw`
            UPDATE contacts
            SET id = gen_random_uuid()::text
            WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        `;
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
