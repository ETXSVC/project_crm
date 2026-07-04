import { getDashboardData } from "@/lib/actions/dashboard";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your projects, CRM pipeline, and team activity
        </p>
      </div>
      <DashboardGrid data={data} />
    </div>
  );
}
