-- Add PENDING value to PartnerStatus enum
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- Add registration form fields to partners table
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "company_name" TEXT;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "nif" TEXT;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "client_count_range" TEXT;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "source" TEXT;

-- Change default status from ACTIVE to PENDING for new records
ALTER TABLE "partners" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"PartnerStatus";

-- Index for duplicate email check during registration
CREATE INDEX IF NOT EXISTS "partners_contact_email_idx" ON "partners"("contact_email");
