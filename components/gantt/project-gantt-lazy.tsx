"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const ProjectGantt = dynamic(
  () => import("@/components/gantt/project-gantt").then((mod) => mod.ProjectGantt),
  {
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading Gantt chart…</p>
      </div>
    ),
    ssr: false,
  }
);

export function ProjectGanttLazy(props: ComponentProps<typeof ProjectGantt>) {
  return <ProjectGantt {...props} />;
}
