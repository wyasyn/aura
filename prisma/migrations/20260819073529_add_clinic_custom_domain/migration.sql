-- A domain the clinic owns at its own registrar. Served only once verified;
-- the subdomain keeps working either way, so a misconfigured domain never
-- takes a clinic offline.
ALTER TABLE "clinic_settings" ADD COLUMN "customDomain" TEXT;
ALTER TABLE "clinic_settings" ADD COLUMN "customDomainToken" TEXT;
ALTER TABLE "clinic_settings" ADD COLUMN "customDomainVerifiedAt" TIMESTAMP(3);

-- Unique so two clinics cannot claim the same host and make routing ambiguous.
CREATE UNIQUE INDEX "clinic_settings_customDomain_key" ON "clinic_settings"("customDomain");
