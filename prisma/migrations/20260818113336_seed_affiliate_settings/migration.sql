-- The affiliate settings row is a fixed singleton (id = 'global'). Seeding it
-- here means the app can always read it, never write it as a side effect of
-- rendering a page — an upsert-on-read triggered a Next.js "Cache Components"
-- build failure (Prisma's upsert runs as an interactive transaction, which
-- generates a random transaction id before any request-scoped data is read).
INSERT INTO "affiliate_settings" ("id", "commissionRateBps", "customerDiscountBps", "updatedAt")
VALUES ('global', 1000, 1000, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
