-- AlterTable: add Communication Profile fields to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "comm_style_tone" TEXT DEFAULT 'directo';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "comm_style_differential" TEXT DEFAULT 'qualidade';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "comm_style_closing" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "comm_profile_set_at" TIMESTAMP(3);

-- AlterTable: add generated call script cache to cadence_events
ALTER TABLE "cadence_events" ADD COLUMN IF NOT EXISTS "generated_script" TEXT;
ALTER TABLE "cadence_events" ADD COLUMN IF NOT EXISTS "script_generated_at" TIMESTAMP(3);
