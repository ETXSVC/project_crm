"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export type VtigerAccountOption = { id: string; name: string };
export type VtigerContactOption = { id: string; name: string; accountId: string | null };

type VtigerLinkFieldsProps = {
  vtigerAccounts: VtigerAccountOption[];
  vtigerContacts: VtigerContactOption[];
  vtigerAccountId: string;
  vtigerContactIds: string[];
  onAccountChange: (value: string) => void;
  onContactsChange: (ids: string[]) => void;
  accountFilterId?: string | null;
};

export function VtigerLinkFields({
  vtigerAccounts,
  vtigerContacts,
  vtigerAccountId,
  vtigerContactIds,
  onAccountChange,
  onContactsChange,
  accountFilterId,
}: VtigerLinkFieldsProps) {
  const availableContacts = accountFilterId
    ? vtigerContacts.filter((c) => !c.accountId || c.accountId === accountFilterId)
    : vtigerContacts;

  const selectedContacts = vtigerContactIds
    .map((id) => availableContacts.find((c) => c.id === id) ?? vtigerContacts.find((c) => c.id === id))
    .filter(Boolean) as VtigerContactOption[];

  const addableContacts = availableContacts.filter((c) => !vtigerContactIds.includes(c.id));

  function addContact(contactId: string) {
    if (!contactId || vtigerContactIds.includes(contactId)) return;
    onContactsChange([...vtigerContactIds, contactId]);
  }

  function removeContact(contactId: string) {
    onContactsChange(vtigerContactIds.filter((id) => id !== contactId));
  }

  if (vtigerAccounts.length === 0 && vtigerContacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-3">
      <p className="text-sm font-medium">Vtiger CRM links</p>
      {vtigerAccounts.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="vtigerAccountId">Vtiger account</Label>
          <Select
            value={vtigerAccountId || "none"}
            onValueChange={(value) => onAccountChange(value === "none" ? "" : value)}
          >
            <SelectTrigger id="vtigerAccountId">
              <SelectValue placeholder="Select Vtiger account (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {vtigerAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {vtigerContacts.length > 0 && (
        <div className="space-y-2">
          <Label>Linked contacts</Label>
          {selectedContacts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map((contact) => (
                <Badge key={contact.id} variant="secondary" className="gap-1 pr-1">
                  {contact.name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeContact(contact.id)}
                    aria-label={`Remove ${contact.name}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
          {addableContacts.length > 0 && (
            <Select onValueChange={addContact}>
              <SelectTrigger>
                <SelectValue placeholder="Add contact..." />
              </SelectTrigger>
              <SelectContent>
                {addableContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedContacts.length === 0 && addableContacts.length === 0 && (
            <p className="text-sm text-muted-foreground">No contacts available to link.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function appendVtigerLinkFormData(
  formData: FormData,
  vtigerAccountId: string,
  vtigerContactIds: string[]
) {
  formData.set("vtigerAccountId", vtigerAccountId);
  formData.delete("vtigerContactIds");
  for (const id of vtigerContactIds) {
    formData.append("vtigerContactIds", id);
  }
}
