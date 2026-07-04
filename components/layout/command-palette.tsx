"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, FolderKanban, Building2, Users, ListTodo } from "lucide-react";
import { globalSearch } from "@/lib/actions/dashboard";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    projects: { id: string; name: string }[];
    accounts: { id: string; name: string }[];
    contacts: { id: string; firstName: string; lastName: string }[];
    tasks: { id: string; name: string; projectId: string }[];
  }>({ projects: [], accounts: [], contacts: [], tasks: [] });

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ projects: [], accounts: [], contacts: [], tasks: [] });
      return;
    }
    const data = await globalSearch(q);
    setResults(data);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const navigate = (href: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    results.projects.length +
      results.accounts.length +
      results.contacts.length +
      results.tasks.length >
    0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search projects, accounts, contacts, tasks..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {!hasResults && query.length >= 2 && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>
            )}

            {results.projects.length > 0 && (
              <Command.Group heading="Projects">
                {results.projects.map((p) => (
                  <Command.Item
                    key={p.id}
                    onSelect={() => navigate(`/projects/${p.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    <FolderKanban className="h-4 w-4" />
                    {p.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.accounts.length > 0 && (
              <Command.Group heading="Accounts">
                {results.accounts.map((a) => (
                  <Command.Item
                    key={a.id}
                    onSelect={() => navigate(`/crm/accounts/${a.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    <Building2 className="h-4 w-4" />
                    {a.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.contacts.length > 0 && (
              <Command.Group heading="Contacts">
                {results.contacts.map((c) => (
                  <Command.Item
                    key={c.id}
                    onSelect={() => navigate("/crm/contacts")}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    <Users className="h-4 w-4" />
                    {c.firstName} {c.lastName}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.tasks.length > 0 && (
              <Command.Group heading="Tasks">
                {results.tasks.map((t) => (
                  <Command.Item
                    key={t.id}
                    onSelect={() => navigate(`/projects/${t.projectId}/tasks`)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    <ListTodo className="h-4 w-4" />
                    {t.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
