"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchActiveTenant } from "@/lib/actions/tenant";

type TenantOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

interface TenantSwitcherProps {
  tenants: TenantOption[];
  activeSlug?: string;
}

export function TenantSwitcher({ tenants, activeSlug }: TenantSwitcherProps) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();

  if (tenants.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="truncate">{activeSlug ?? "workspace"}</span>
      </div>
    );
  }

  async function onSelect(tenantId: string) {
    startTransition(async () => {
      const result = await switchActiveTenant(tenantId);
      if (!result.success || result.error) return;

      await update({
        activeTenantId: result.tenantId,
        activeTenantSlug: result.tenantSlug,
        role: result.role,
      });
      router.refresh();
    });
  }

  const active = tenants.find((t) => t.isActive) ?? tenants[0];

  return (
    <div className="relative px-3 py-2">
      <label className="sr-only" htmlFor="tenant-switcher">
        Switch workspace
      </label>
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          id="tenant-switcher"
          disabled={pending}
          value={active?.id ?? ""}
          onChange={(event) => onSelect(event.target.value)}
          className={cn(
            "w-full appearance-none rounded-md border bg-background py-2 pl-8 pr-8 text-sm",
            pending && "opacity-60"
          )}
        >
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {active && (
        <p className="mt-1 truncate pl-1 text-xs text-muted-foreground">{active.slug}</p>
      )}
      {tenants.filter((t) => t.isActive).length === 1 && (
        <span className="sr-only">
          {tenants.filter((t) => t.isActive).map((t) => (
            <Check key={t.id} aria-hidden />
          ))}
        </span>
      )}
    </div>
  );
}
