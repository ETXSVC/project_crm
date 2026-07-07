"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { acceptInvitation } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";

type AcceptInviteButtonProps = {
  token: string;
};

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { update } = useSession();

  return (
    <Button
      type="button"
      className="w-full"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await acceptInvitation(token);
          if (result?.error) {
            alert(result.error);
            return;
          }
          await update({
            activeTenantId: result.tenantId,
            activeTenantSlug: result.tenantSlug,
            role: result.role,
          });
          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      Accept invitation
    </Button>
  );
}
