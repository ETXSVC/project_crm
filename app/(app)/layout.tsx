import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notificationCount = session.user.activeTenantId
    ? await prisma.notification.count({
        where: {
          tenantId: session.user.activeTenantId,
          userId: session.user.id,
          read: false,
        },
      })
    : 0;

  return (
    <AppShell user={session.user} notificationCount={notificationCount}>
      {children}
    </AppShell>
  );
}
