-- CreateIndex: unique constraint on (name, birthYear) to prevent duplicate competitors
-- Note: PostgreSQL treats NULL as distinct in unique indexes, so two rows with birthYear=NULL
-- are still considered different. This is acceptable since CSV import always requires birthYear.
CREATE UNIQUE INDEX "competitor_name_birthYear_key" ON "Competitor"("name", "birthYear");
