import Link from "next/link";
import { auth } from "@/lib/auth";
import { getInvitationByToken } from "@/lib/actions/members";
import { AcceptInviteButton } from "@/components/auth/accept-invite-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban } from "lucide-react";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>This invitation is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FolderKanban className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join {invitation.tenantName}</CardTitle>
          <CardDescription>
            You&apos;ve been invited as <strong>{invitation.roleLabel}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Invitation for <strong>{invitation.email}</strong>. Expires{" "}
            {invitation.expiresAt.toLocaleDateString()}.
          </p>

          {!session?.user ? (
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>
              <Button className="w-full">Sign in to accept</Button>
            </Link>
          ) : session.user.email?.toLowerCase() !== invitation.email.toLowerCase() ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                You are signed in as {session.user.email}. Sign in as {invitation.email} to accept.
              </p>
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>
                <Button variant="outline" className="w-full">
                  Switch account
                </Button>
              </Link>
            </div>
          ) : (
            <AcceptInviteButton token={token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
