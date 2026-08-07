import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type Client } from "@/lib/workspace";
import { formatCaseNumber } from "@/lib/case";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { CaseFormDialog } from "@/components/CaseFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client details | Advocase" },
      { name: "description", content: "Client profile with all linked cases." },
      { property: "og:title", content: "Client details | Advocase" },
      { property: "og:description", content: "Client profile with all linked cases." },
    ],
  }),
  component: ClientDetailPage,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const { data: ws } = useWorkspace();
  const [editOpen, setEditOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as Client | null;
    },
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["cases", "client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Client not found"
        description="This client may have been deleted."
        action={
          <Button onClick={() => navigate({ to: "/clients" })}>Back to clients</Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/clients">
          <ArrowLeft className="size-4" /> Clients
        </Link>
      </Button>

      <PageHeader
        title={client.full_name}
        description={client.district ? `${client.district}, Gujarat` : "Client profile"}
        action={
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      <Card className="surface-card">
        <CardContent className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Full name" value={client.full_name} />
          <Field label="Mobile" value={client.mobile} />
          <Field label="Email" value={client.email} />
          <Field label="District" value={client.district} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label="Notes" value={client.notes} />
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Cases ({cases.length})</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setCaseOpen(true)}>
            <Plus className="size-4" /> Add case
          </Button>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No cases for this client"
              description="Create a case to start tracking hearings."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case number</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                    <Link
  to="/cases/$caseId"
  params={{ caseId: c.id }}
  className="font-medium underline-offset-4 hover:underline"
>
  {formatCaseNumber(
    c.case_code,
    c.case_serial,
    c.case_year,
  )}
</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.court_name}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {ws ? (
        <>
          <ClientFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            workspace={ws}
            client={client}
          />
          <CaseFormDialog
            open={caseOpen}
            onOpenChange={setCaseOpen}
            workspace={ws}
            defaultClientId={client.id}
          />
        </>
      ) : null}
    </div>
  );
}
