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

    // Seed/update plans if plans table exists
    if (await tableExists("plans")) {
        console.log("📝 Updating plans with frozen pricing...");

        // Check if max_users column exists, add if not
        const maxUsersExists = await columnExists("plans", "max_users");
        if (!maxUsersExists) {
            await prisma.$executeRaw`
                ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1
            `;
            console.log("✅ Added max_users column to plans");
        }

        // Check if is_public column exists, add if not
        const isPublicExists = await columnExists("plans", "is_public");
        if (!isPublicExists) {
            await prisma.$executeRaw`
                ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true
            `;
            console.log("✅ Added is_public column to plans");
        }

        // Upsert plans with frozen pricing: Free=5, Starter=€39/80, Pro=€99/250, Pro+=€149/500
        // Pro+ and Enterprise are hidden (isPublic=false)
        await prisma.$executeRaw`
            INSERT INTO plans (id, name, monthly_quote_limit, price_monthly, max_users, is_active, is_public, created_at, updated_at)
            VALUES
                ('free', 'Gratuito', 5, 0, 1, true, true, NOW(), NOW()),
                ('starter', 'Starter', 80, 3900, 2, true, true, NOW(), NOW()),
                ('pro', 'Pro', 250, 9900, 5, true, true, NOW(), NOW()),
                ('pro_plus', 'Pro+', 500, 14900, 10, true, false, NOW(), NOW()),
                ('enterprise', 'Enterprise', 1000, 0, 999, false, false, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                monthly_quote_limit = EXCLUDED.monthly_quote_limit,
                price_monthly = EXCLUDED.price_monthly,
                max_users = EXCLUDED.max_users,
                is_active = EXCLUDED.is_active,
                is_public = EXCLUDED.is_public,
                updated_at = NOW()
        `;

        console.log("✅ Plans updated (Free=5, Starter=€39/80, Pro=€99/250, Pro+=€149/500 hidden)");
    }

    // Migrate stripe_events table for retry support
    if (await tableExists("stripe_events")) {
        console.log("📝 Checking stripe_events schema for status column...");

        const statusExists = await columnExists("stripe_events", "status");
        if (!statusExists) {
            // Create enum type if it doesn't exist
            await prisma.$executeRaw`
                DO $$ BEGIN
                    CREATE TYPE "StripeEventStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            `;

            // Add status column with default PROCESSED (for existing events)
            await prisma.$executeRaw`
                ALTER TABLE stripe_events
                ADD COLUMN IF NOT EXISTS status "StripeEventStatus" DEFAULT 'PROCESSED'
            `;

            // Add claimed_at column
            await prisma.$executeRaw`
                ALTER TABLE stripe_events
                ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP(3) DEFAULT NOW()
            `;

            // Rename processed_at to keep compatibility
            const processedAtExists = await columnExists("stripe_events", "processed_at");
            if (processedAtExists) {
                // Make processed_at nullable (for PROCESSING/FAILED states)
                await prisma.$executeRaw`
                    ALTER TABLE stripe_events
                    ALTER COLUMN processed_at DROP NOT NULL
                `;
            } else {
                await prisma.$executeRaw`
                    ALTER TABLE stripe_events
                    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP(3)
                `;
            }

            // Add error_message column
            await prisma.$executeRaw`
                ALTER TABLE stripe_events
                ADD COLUMN IF NOT EXISTS error_message TEXT
            `;

            // Set claimed_at from processed_at for existing records
            await prisma.$executeRaw`
                UPDATE stripe_events
                SET claimed_at = COALESCE(processed_at, NOW())
                WHERE claimed_at IS NULL
            `;

            console.log("✅ stripe_events schema updated with status/retry support");
        } else {
            console.log("✅ stripe_events already has status column");
        }
    }

    // Migrate users table for OAuth support (organizationId nullable)
    if (await tableExists("users")) {
        console.log("📝 Checking users table for OAuth support...");

        // Check if organization_id column is nullable
        const result = await prisma.$queryRaw<{ is_nullable: string }[]>`
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'organization_id'
        `;

        if (result.length > 0 && result[0].is_nullable === "NO") {
            console.log("📝 Making organization_id nullable for OAuth users...");

            // Drop the foreign key constraint first (if exists)
            await prisma.$executeRaw`
                ALTER TABLE users
                DROP CONSTRAINT IF EXISTS users_organization_id_fkey
            `;

            // Make organization_id nullable
            await prisma.$executeRaw`
                ALTER TABLE users
                ALTER COLUMN organization_id DROP NOT NULL
            `;

            // Re-add the foreign key constraint with ON DELETE CASCADE
            await prisma.$executeRaw`
                ALTER TABLE users
                ADD CONSTRAINT users_organization_id_fkey
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            `;

            // Add unique constraint on email if not exists (for OAuth account linking)
            await prisma.$executeRaw`
                CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)
            `;

            console.log("✅ users table updated for OAuth support");
        } else {
            console.log("✅ users.organization_id already nullable");
        }
    }

    // Migrate inbound_ingestions.provider from String to InboundProvider enum
    // Must run BEFORE prisma db push so the column type is compatible
    if (await tableExists("inbound_ingestions")) {
        // Step 1: Backfill orphaned stub rows (Sprint 0) from "mailgun"/NULL to "cloudflare"
        console.log("📝 Backfilling orphaned inbound_ingestions provider...");
        const backfilled = await prisma.$executeRaw`
            UPDATE inbound_ingestions
            SET provider = 'cloudflare'
            WHERE (provider = 'mailgun' OR provider IS NULL)
              AND organization_id IS NULL
              AND quote_id IS NULL
              AND status = 'pending'
        `;
        console.log(`✅ Backfilled ${backfilled} orphaned rows`);

        // Step 2: Sanitize any invalid provider values (NULL, whitespace, unknown) before enum conversion
        console.log("📝 Sanitizing invalid provider values...");
        const sanitized = await prisma.$executeRaw`
            UPDATE inbound_ingestions
            SET provider = 'cloudflare'
            WHERE provider IS NULL
               OR TRIM(provider) NOT IN ('cloudflare', 'mailgun')
        `;
        if (sanitized > 0) console.log(`  ↳ Sanitized ${sanitized} rows`);

        // Step 3: Create InboundProvider enum type if not exists
        console.log("📝 Creating InboundProvider enum type...");
        await prisma.$executeRaw`
            DO $$ BEGIN
                CREATE TYPE "InboundProvider" AS ENUM ('cloudflare', 'mailgun');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `;

        // Step 4: Convert provider column from text to enum
        // Check if it's still text (not already the InboundProvider enum)
        const colType = await prisma.$queryRaw<{ data_type: string; udt_name: string }[]>`
            SELECT data_type, udt_name FROM information_schema.columns
            WHERE table_name = 'inbound_ingestions' AND column_name = 'provider'
        `;
        const isAlreadyEnum = colType.length > 0
            && colType[0].data_type === 'USER-DEFINED'
            && colType[0].udt_name === 'InboundProvider';
        if (colType.length > 0 && !isAlreadyEnum) {
            console.log("📝 Converting provider column to enum...");
            // Drop old text default BEFORE type conversion (PG can't auto-cast text default to enum)
            await prisma.$executeRaw`
                ALTER TABLE inbound_ingestions
                ALTER COLUMN provider DROP DEFAULT
            `;
            await prisma.$executeRaw`
                ALTER TABLE inbound_ingestions
                ALTER COLUMN provider TYPE "InboundProvider" USING provider::"InboundProvider"
            `;
            // Set new enum-typed default AFTER conversion
            await prisma.$executeRaw`
                ALTER TABLE inbound_ingestions
                ALTER COLUMN provider SET DEFAULT 'cloudflare'::"InboundProvider"
            `;
            console.log("✅ Provider column converted to enum");
        } else {
            console.log("✅ Provider column already enum");
        }

        // Step 5: Drop old global unique on provider_message_id (if exists)
        // The new schema uses @@unique([provider, providerMessageId]) instead
        console.log("📝 Dropping old provider_message_id unique constraint...");
        await prisma.$executeRaw`
            DROP INDEX IF EXISTS "inbound_ingestions_provider_message_id_key"
        `;
        // Also drop the standalone index (@@index([providerMessageId]))
        await prisma.$executeRaw`
            DROP INDEX IF EXISTS "inbound_ingestions_provider_message_id_idx"
        `;
        console.log("✅ Old provider_message_id indexes dropped");

        // Post-migration validation
        const providerDist = await prisma.$queryRaw<{ provider: string; count: bigint }[]>`
            SELECT provider::text, COUNT(*) as count FROM inbound_ingestions GROUP BY provider
        `;
        console.log("📊 Provider distribution:", providerDist.map(r => `${r.provider}=${r.count}`).join(", ") || "(empty table)");

        const nullCount = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) as count FROM inbound_ingestions WHERE provider IS NULL
        `;
        const invalidCount = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) as count FROM inbound_ingestions WHERE provider::text NOT IN ('cloudflare', 'mailgun')
        `;
        if (Number(nullCount[0]?.count) > 0 || Number(invalidCount[0]?.count) > 0) {
            console.error(`❌ Validation failed: ${nullCount[0]?.count} NULL, ${invalidCount[0]?.count} invalid provider values`);
            throw new Error("Provider migration validation failed — aborting");
        }
        console.log("✅ Validation passed: 0 NULL, 0 invalid provider values");
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
