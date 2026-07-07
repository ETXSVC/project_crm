-- Per-workspace Vtiger CRM credentials (accessed by tenant id from session; not RLS-scoped on Tenant row)
ALTER TABLE "Tenant" ADD COLUMN "vtigerBaseUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "vtigerUsername" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "vtigerAccessKey" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "vtigerPublicUrl" TEXT;
