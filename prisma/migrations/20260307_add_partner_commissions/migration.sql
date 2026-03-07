-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('CALCULATED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "partner_commissions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "subscription_amount" DOUBLE PRECISION NOT NULL,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "commission_amount" DOUBLE PRECISION NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'CALCULATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_commissions_partner_id_period_idx" ON "partner_commissions"("partner_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "partner_commissions_partner_id_client_id_period_key" ON "partner_commissions"("partner_id", "client_id", "period");

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
