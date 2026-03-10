-- Add email signature fields to organizations table
ALTER TABLE "organizations" ADD COLUMN "signature_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN "signature_title" TEXT;
ALTER TABLE "organizations" ADD COLUMN "signature_phone" TEXT;
ALTER TABLE "organizations" ADD COLUMN "signature_website" TEXT;
ALTER TABLE "organizations" ADD COLUMN "signature_logo_path" TEXT;
