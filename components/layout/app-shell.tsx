"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Building2,
  UserPlus,
  Target,
  Activity,
  Settings,
  Bell,
  Search,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/layout/command-palette";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  {
    label: "CRM",
    icon: Users,
    children: [
      { href: "/crm/accounts", label: "Accounts", icon: Building2 },
      { href: "/crm/contacts", label: "Contacts", icon: Users },
      { href: "/crm/leads", label: "Leads", icon: UserPlus },
      { href: "/crm/opportunities", label: "Opportunities", icon: Target },
      { href: "/crm/activities", label: "Activities", icon: Activity },
    ],
  },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  user: { name?: string | null; email: string; activeTenantSlug?: string };
  notificationCount?: number;
  tenants?: Array<{ id: string; name: string; slug: string; isActive: boolean }>;
}

export function AppShell({ children, user, notificationCount = 0, tenants = [] }: AppShellProps) {
  const pathname = usePathname();
  const [crmOpen, setCrmOpen] = useState(pathname.startsWith("/crm"));
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">ProjTest</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            if (item.children) {
              const isActive = pathname.startsWith("/crm");
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setCrmOpen(!crmOpen)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", crmOpen && "rotate-180")}
                    />
                  </button>
                  {crmOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                            pathname === child.href && "bg-accent font-medium"
                          )}
                        >
                          <child.icon className="h-4 w-4" />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t">
          <TenantSwitcher tenants={tenants} activeSlug={user.activeTenantSlug} />
        </div>

        <div className="border-t p-4">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{user.name ?? "User"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.activeTenantSlug ?? "workspace"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <Button
            variant="outline"
            className="w-64 justify-start text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            Search...
            <kbd className="ml-auto rounded border px-1.5 text-xs">⌘K</kbd>
          </Button>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
