"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/crm", label: "Overview", exact: true },
  { href: "/crm/accounts", label: "Accounts" },
  { href: "/crm/contacts", label: "Contacts" },
  { href: "/crm/leads", label: "Leads" },
  { href: "/crm/opportunities", label: "Opportunities" },
];

export function CrmTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
