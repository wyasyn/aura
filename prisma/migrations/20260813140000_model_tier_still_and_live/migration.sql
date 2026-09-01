-- A tier now holds one still model and one live model, so the uniqueness key
-- widens from the tier alone to the tier plus the live flag.
DROP INDEX "ai_model_rate_assignedTier_key";

CREATE UNIQUE INDEX "ai_model_rate_assignedTier_supportsLive_key"
  ON "ai_model_rate"("assignedTier", "supportsLive");
