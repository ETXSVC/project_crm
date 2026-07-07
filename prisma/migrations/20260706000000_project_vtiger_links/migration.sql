-- Link projects to Vtiger accounts and contacts

ALTER TABLE "Project" ADD COLUMN "vtigerAccountId" TEXT;

CREATE TABLE "ProjectVtigerContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vtigerContactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectVtigerContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectVtigerContact_tenantId_projectId_vtigerContactId_key" ON "ProjectVtigerContact"("tenantId", "projectId", "vtigerContactId");
CREATE INDEX "ProjectVtigerContact_tenantId_projectId_idx" ON "ProjectVtigerContact"("tenantId", "projectId");
CREATE INDEX "ProjectVtigerContact_tenantId_vtigerContactId_idx" ON "ProjectVtigerContact"("tenantId", "vtigerContactId");
CREATE INDEX "Project_vtigerAccountId_idx" ON "Project"("tenantId", "vtigerAccountId");

ALTER TABLE "ProjectVtigerContact" ADD CONSTRAINT "ProjectVtigerContact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectVtigerContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectVtigerContact" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ProjectVtigerContact"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON "ProjectVtigerContact" TO proj_app;
