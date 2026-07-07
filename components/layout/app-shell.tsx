"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  Bell,
  Search,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canViewCrm, canViewProjects } from "@/lib/auth/permissions";
import type { TenantRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/layout/command-palette";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email: string;
    activeTenantSlug?: string;
    role?: TenantRole;
  };
  notificationCount?: number;
  tenants?: Array<{ id: string; name: string; slug: string; isActive: boolean }>;
}

function filterNavItems(role: TenantRole | undefined) {
  return navItems.filter((item) => {
    if (item.href === "/projects") return canViewProjects(role);
    if (item.href === "/crm") return canViewCrm(role);
    if (item.href === "/settings") return true;
    return true;
  });
}

export function AppShell({ children, user, notificationCount = 0, tenants = [] }: AppShellProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const visibleNavItems = filterNavItems(user.role);

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
          {visibleNavItems.map((item) => {
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
                {user.activeTenantSlug ?? "company"}
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
