"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface AccountFormValues {
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
}

interface AccountFormFieldsProps {
  idPrefix: string;
  defaultValues?: Partial<AccountFormValues>;
}

export function AccountFormFields({ idPrefix, defaultValues }: AccountFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Company Name</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={defaultValues?.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-industry`}>Industry</Label>
        <Input
          id={`${idPrefix}-industry`}
          name="industry"
          defaultValue={defaultValues?.industry ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-website`}>Website</Label>
          <Input
            id={`${idPrefix}-website`}
            name="website"
            defaultValue={defaultValues?.website ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-address`}>Address</Label>
        <Input
          id={`${idPrefix}-address`}
          name="address"
          defaultValue={defaultValues?.address ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          defaultValue={defaultValues?.description ?? ""}
        />
      </div>
    </>
  );
}
