import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type Client } from "@/lib/workspace";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Clients | Advocase" },
      { name: "description", content: "Manage every client in your practice." },
      { property: "og:title", content: "Clients | Advocase" },
      { property: "og:description", content: "Search, add and edit client records." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data: ws } = useWorkspace();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
const [editing, setEditing] = useState<Client | null>(null);
const [deleting, setDeleting] = useState<Client | null>(null);
const [deletingCaseCount, setDeletingCaseCount] = useState(0);

const PAGE_SIZE = 25;

const [page, setPage] = useState(0);

const { data: clientsResult, isLoading } = useQuery({
  queryKey: ["clients", page, term],
  queryFn: async () => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("clients")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    const search = term.trim();

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,mobile.ilike.%${search}%,district.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      clients: data ?? [],
      count: count ?? 0,
    };
  },
});

const clients = clientsResult?.clients ?? [];
const totalClients = clientsResult?.count ?? 0;
const totalPages = Math.ceil(totalClients / PAGE_SIZE);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Client deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Every person you represent, in one place."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add client
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
  value={term}
  maxLength={100}
          onChange={(e) => {
            setTerm(e.target.value);
            setPage(0);
          }}
          placeholder="Search by name, mobile or district"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
  icon={Users}
  title={term.trim() ? "No matching clients" : "No clients yet"}
  description={
    term.trim()
      ? "Try a different name, mobile number or district."
      : "Add your first client to get started."
  }
  action={
    !term.trim() ? (
      <Button
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        Add client
      </Button>
    ) : undefined
  }
/>
      ) : (
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">District</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {clients.map((client) => (
                <TableRow key={client.id} className="transition-colors hover:bg-muted/60">
                  <TableCell>
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: client.id }}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {client.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.mobile || "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {client.email || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {client.district || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild aria-label="View client">
                        <Link to="/clients/$clientId" params={{ clientId: client.id }}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit client"
                        onClick={() => {
                          setEditing(client);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
  variant="ghost"
  size="icon"
  aria-label="Delete client"
  onClick={async () => {
    const { count, error } = await supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setDeletingCaseCount(count ?? 0);
    setDeleting(client);
  }}
>
  <Trash2 className="size-4 text-destructive" />
</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>

<div className="flex items-center justify-between border-t px-4 py-3">
  <p className="text-sm text-muted-foreground">
    Page {page + 1} of {totalPages}
  </p>

  <div className="flex gap-2">
    <Button
      variant="outline"
      size="sm"
      disabled={page === 0}
      onClick={() => setPage((current) => current - 1)}
    >
      Previous
    </Button>

    <Button
      variant="outline"
      size="sm"
      disabled={page >= totalPages - 1}
      onClick={() => setPage((current) => current + 1)}
    >
      Next
    </Button>
  </div>
</div>
</div>
      )}

      {ws ? (
        <ClientFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          workspace={ws}
          client={editing}
        />
      ) : null}

<ConfirmDialog
  open={!!deleting}
  onOpenChange={(open) => {
    if (!open) {
      setDeleting(null);
      setDeletingCaseCount(0);
    }
  }}
  title={`Delete ${deleting?.full_name ?? "client"}?`}
  description={
    deletingCaseCount > 0
      ? `${deleting?.full_name ?? "This client"} has ${deletingCaseCount} ${
          deletingCaseCount === 1 ? "registered case" : "registered cases"
        }. If you delete this client, ${
          deletingCaseCount === 1 ? "that case will" : "all of those cases will"
        } also be permanently deleted. Are you sure you want to continue?`
      : `Are you sure you want to permanently delete ${deleting?.full_name ?? "this client"}?`
  }
  onConfirm={() => {
    if (deleting) remove.mutate(deleting.id);
    setDeleting(null);
    setDeletingCaseCount(0);
  }}
/>
    </div>
  );
}
