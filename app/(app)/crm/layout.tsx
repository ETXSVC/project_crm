import { CrmTabs } from "@/components/crm/crm-tabs";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
        <p className="text-muted-foreground">Vtiger CRM accounts, contacts, and pipeline</p>
      </div>
      <CrmTabs />
      {children}
    </div>
  );
}
