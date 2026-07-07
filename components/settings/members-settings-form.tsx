"use client";

import { useState, useTransition } from "react";
import {
  createMemberInvite,
  revokeMemberInvite,
  updateMemberRole,
  removeMember,
} from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Member = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  roleLabel: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  roleLabel: string;
  expiresAt: Date;
  token: string;
};

type RoleOption = { value: string; label: string };

type MembersSettingsFormProps = {
  members: Member[];
  invitations: PendingInvite[];
  assignableRoles: RoleOption[];
  canInvite: boolean;
  canManage: boolean;
};

export function MembersSettingsForm({
  members,
  invitations,
  assignableRoles,
  canInvite,
  canManage,
}: MembersSettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState("MEMBER");

  function onInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("role", inviteRole);
    startTransition(async () => {
      setMessage(null);
      setInviteUrl(null);
      const result = await createMemberInvite(formData);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      setInviteUrl(result.inviteUrl ?? null);
      setMessage("Invitation created. Share the link below with the invitee.");
      event.currentTarget.reset();
    });
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Members & invitations</CardTitle>
        <CardDescription>
          Manage company access, roles, and pending invitations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {canInvite && (
          <form onSubmit={onInviteSubmit} className="space-y-4 rounded-md border p-4">
            <h3 className="font-medium">Invite member</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" name="email" type="email" required placeholder="colleague@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              Send invitation
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            {inviteUrl && (
              <div className="rounded-md bg-muted p-3 text-sm break-all">
                <span className="font-medium">Invite link:</span> {inviteUrl}
              </div>
            )}
          </form>
        )}

        <div className="space-y-3">
          <h3 className="font-medium">Current members ({members.length})</h3>
          <div className="divide-y rounded-md border">
            {members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{member.name ?? member.email}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <Select
                      defaultValue={member.role}
                      onValueChange={(value) => {
                        startTransition(async () => {
                          const result = await updateMemberRole(member.id, value);
                          if (result?.error) alert(result.error);
                        });
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {member.role === "OWNER" && (
                          <SelectItem value="OWNER">Owner</SelectItem>
                        )}
                        {assignableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{member.roleLabel}</Badge>
                  )}
                  {canManage && member.role !== "OWNER" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`Remove ${member.email} from this company?`)) return;
                        startTransition(async () => {
                          const result = await removeMember(member.id);
                          if (result?.error) alert(result.error);
                        });
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {invitations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Pending invitations</h3>
            <div className="divide-y rounded-md border">
              {invitations.map((invite) => (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {invite.roleLabel} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  {canInvite && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await revokeMemberInvite(invite.id);
                          if (result?.error) alert(result.error);
                        });
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
