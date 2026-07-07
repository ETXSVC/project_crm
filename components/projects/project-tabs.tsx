"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TAB_PATHS = ["tasks", "gantt", "resources"] as const;

type ProjectTabsProps = {
  projectId: string;
};

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  const tabs = [
    { href: base, label: "Overview", active: pathname === base },
    ...TAB_PATHS.map((segment) => {
      const href = `${base}/${segment}`;
      return { href, label: segment.charAt(0).toUpperCase() + segment.slice(1), active: pathname === href };
    }),
  ];

  return (
    <div className="flex gap-2 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab.active
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
