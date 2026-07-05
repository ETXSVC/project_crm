import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createTenantPrisma } from "@/lib/db/prisma";
import { getUserTenants } from "@/lib/actions/tenant";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let notificationCount = 0;
  const tenants = await getUserTenants();

  if (session.user.activeTenantId) {
    const db = createTenantPrisma(session.user.activeTenantId);
    notificationCount = await db.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    });
  }

  return (
    <AppShell user={session.user} notificationCount={notificationCount} tenants={tenants}>
      {children}
    </AppShell>
  );
}
