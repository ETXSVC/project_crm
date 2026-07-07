"use client";

import { useCallback, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FolderKanban,
  Target,
  Calendar,
  Users,
  Activity,
  Plus,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { saveDashboardLayout } from "@/lib/actions/dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  projectHealth: { onTrack: number; atRisk: number; overdue: number };
  projects: { id: string; name: string; status: string; endDate: Date | null }[];
  milestones: {
    id: string;
    name: string;
    dateLabel: string;
    project: { name: string };
  }[];
  auditLogs: {
    id: string;
    action: string;
    entityType: string;
    createdAtLabel: string;
    user: { name: string | null; email: string } | null;
  }[];
  crmStats: {
    pipelineValue: number;
    stages: { id: string; name: string; count: number; value: number }[];
  };
  workload: { id: string; name: string; assignmentCount: number; avgProgress: number }[];
  notifications: { id: string; title: string; message: string; createdAt: Date }[];
  layout: Layout[];
}

export function DashboardGrid({ data }: { data: DashboardData }) {
  const [layout, setLayout] = useState<Layout[]>(data.layout as Layout[]);

  const onLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
    saveDashboardLayout(newLayout);
  }, []);

  const widgets: Record<string, React.ReactNode> = {
    "project-health": (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="h-4 w-4" />
            Project Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{data.projectHealth.onTrack}</p>
              <p className="text-xs text-muted-foreground">On Track</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{data.projectHealth.atRisk}</p>
              <p className="text-xs text-muted-foreground">At Risk</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{data.projectHealth.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    ),
    "crm-pipeline": (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            CRM Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-2xl font-bold">{formatCurrency(data.crmStats.pipelineValue)}</p>
          <div className="space-y-1">
            {data.crmStats.stages.slice(0, 4).map((stage) => (
              <div key={stage.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{stage.name}</span>
                <Badge variant="secondary">{stage.count}</Badge>
              </div>
            ))}
          </div>
          <Link href="/crm" className="mt-3 inline-block text-sm text-primary hover:underline">
            Open Vtiger CRM
          </Link>
        </CardContent>
      </Card>
    ),
    upcoming: (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Upcoming Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming milestones</p>
          ) : (
            <div className="space-y-2">
              {data.milestones.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.project.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.dateLabel}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    ),
    workload: (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Team Workload
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.workload.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources assigned</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.workload}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="assignmentCount" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    ),
    activity: (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {data.auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p>
                    <span className="font-medium">{log.user?.name ?? "System"}</span>{" "}
                    {log.action.toLowerCase()}d {log.entityType}
                  </p>
                  <p className="text-xs text-muted-foreground">{log.createdAtLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ),
    "quick-actions": (
      <Card className="h-full">
        <CardContent className="flex h-full items-center gap-3 p-4">
          <Link href="/projects">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Project
            </Button>
          </Link>
          <Link href="/crm">
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" />
              Open CRM
            </Button>
          </Link>
          <Link href="/crm">
            <Button size="sm" variant="outline">
              <TrendingUp className="mr-1 h-4 w-4" />
              Pipeline
            </Button>
          </Link>
        </CardContent>
      </Card>
    ),
  };

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={80}
      width={1200}
      onLayoutChange={onLayoutChange}
      draggableHandle=".drag-handle"
    >
      {layout.map((item) => (
        <div key={item.i} className="relative">
          <div className="drag-handle absolute right-2 top-2 z-10 cursor-move rounded bg-muted px-1 text-xs text-muted-foreground">
            ⠿
          </div>
          {widgets[item.i]}
        </div>
      ))}
    </GridLayout>
  );
}
