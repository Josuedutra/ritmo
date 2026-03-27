-- Add NPS score fields to feedback_items table
ALTER TABLE "feedback_items" ADD COLUMN "nps_score" INTEGER;
ALTER TABLE "feedback_items" ADD COLUMN "nps_segment" TEXT;

-- Index for NPS segment queries
CREATE INDEX "feedback_items_nps_segment_created_at_idx" ON "feedback_items"("nps_segment", "created_at");
