-- Rename the middle scan tier from "thinking" to "plus".
-- RENAME VALUE keeps every existing row pointing at the same tier.
ALTER TYPE "ScanTier" RENAME VALUE 'thinking' TO 'plus';

-- Pack labels are free text and are matched by label in db:seed-packs.
UPDATE "scan_pack"
SET "label" = replace("label", 'Thinking', 'Plus')
WHERE "label" LIKE 'Thinking%';
