-- Per-field provenance for product intelligence.
--
-- Additive only. No column is dropped and no row is deleted.
--
-- Left NULL for every existing product on purpose. Nothing recorded where their
-- current values came from, and back-filling a guess would be the one thing
-- this column exists to prevent: an admin surface claiming an origin nobody
-- ever established. They fill in as each field is next written.
ALTER TABLE "product" ADD COLUMN "intelligenceProvenance" JSONB;
