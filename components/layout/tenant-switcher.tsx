"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { switchActiveTenant } from "@/lib/actions/tenant";
import { CreateCompanyDialog } from "@/components/companies/create-company-dialog";

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

  const active = tenants.find((t) => t.isActive) ?? tenants[0];

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

  if (tenants.length <= 1) {
    return (
      <div className="space-y-1 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{active?.name ?? activeSlug ?? "company"}</span>
        </div>
        {active?.slug && (
          <p className="truncate pl-6 text-xs text-muted-foreground">{active.slug}</p>
        )}
        <CreateCompanyDialog triggerClassName="mt-1 w-full justify-start gap-2 px-1 text-xs text-muted-foreground hover:text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-1 px-3 py-2">
      <label className="sr-only" htmlFor="tenant-switcher">
        Switch company
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
          aria-label="Switch company"
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
        <p className="truncate pl-1 text-xs text-muted-foreground">{active.slug}</p>
      )}
      <CreateCompanyDialog />
    </div>
  );
}
