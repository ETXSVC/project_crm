"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVtigerAccount } from "@/lib/actions/vtiger-crm";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus } from "lucide-react";
import { AccountFormFields } from "@/components/crm/account-form-fields";

export function CreateAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeModal() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createVtigerAccount(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    closeModal();
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Account
      </Button>

      <Modal open={open} onClose={closeModal} title="Create Account">
        <form onSubmit={handleSubmit} className="space-y-4">
          <AccountFormFields idPrefix="create-account" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create Account"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
