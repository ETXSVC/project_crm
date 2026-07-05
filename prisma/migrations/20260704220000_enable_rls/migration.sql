-- Application role subject to RLS (non-superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'proj_app') THEN
    CREATE ROLE proj_app WITH LOGIN PASSWORD 'proj_app';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE projtest TO proj_app;
GRANT USAGE ON SCHEMA public TO proj_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO proj_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO proj_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO proj_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO proj_app;

-- Helper: enable tenant isolation on tables with a direct tenantId column
-- Policies compare against session GUC set by the app via set_config('app.tenant_id', ...)

CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')
$$;

-- ─── Tenant-owned tables (direct tenantId) ───────────────────────────────────

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Project"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Task"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "TaskDependency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskDependency" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TaskDependency"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Milestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Milestone"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Resource"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "ResourceAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ResourceAssignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ResourceAssignment"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Baseline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Baseline" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Baseline"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "ProjectCalendar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectCalendar" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ProjectCalendar"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "CrmAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmAccount" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CrmAccount"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Contact"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Lead"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PipelineStage"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Opportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Opportunity" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Opportunity"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Activity"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "DashboardLayout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DashboardLayout" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "DashboardLayout"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLog"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Notification"
  FOR ALL
  USING ("tenantId" = app_current_tenant_id())
  WITH CHECK ("tenantId" = app_current_tenant_id());

-- BaselineTask has no tenantId; isolate via parent Baseline
ALTER TABLE "BaselineTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BaselineTask" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "BaselineTask"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Baseline" b
      WHERE b.id = "BaselineTask"."baselineId"
        AND b."tenantId" = app_current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Baseline" b
      WHERE b.id = "BaselineTask"."baselineId"
        AND b."tenantId" = app_current_tenant_id()
    )
  );
