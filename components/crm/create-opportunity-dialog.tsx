"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVtigerOpportunity } from "@/lib/actions/vtiger-crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface CreateOpportunityDialogProps {
  accounts: { id: string; name: string }[];
  stages: string[];
}

export function CreateOpportunityDialog({ accounts, stages }: CreateOpportunityDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createVtigerOpportunity(formData);
    setPending(false);
    if (result?.success) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Opportunity</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Deal Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Value ($)</Label>
            <Input id="value" name="value" type="number" min={0} />
          </div>
          {stages.length > 0 && (
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select name="stageId" defaultValue={stages[0]}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label>Account</Label>
              <Select name="crmAccountId">
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create Opportunity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
