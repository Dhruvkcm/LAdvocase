import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type Case } from "@/lib/workspace";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseFormDialog } from "@/components/CaseFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  head: () => ({
    meta: [
      { title: "Case details | Advocase" },
      { name: "description", content: "Full case record, court details and hearing dates." },
      { property: "og:title", content: "Case details | Advocase" },
      { property: "og:description", content: "Full case record and hearing dates." },
    ],
  }),
  component: CaseDetailPage,
});

type CaseRow = Case & { clients: { id: string; full_name: string } | null };

const fmt = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

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

function CaseDetailPage() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const { data: ws } = useWorkspace();
  const [editOpen, setEditOpen] = useState(false);

  const { data: record, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*, clients(id, full_name)")
        .eq("id", caseId)
        .maybeSingle();
      if (error) throw error;
      return data as CaseRow | null;
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

  if (!record) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Case not found"
        description="This case may have been deleted."
        action={<Button onClick={() => navigate({ to: "/cases" })}>Back to cases</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/cases">
          <ArrowLeft className="size-4" /> Cases
        </Link>
      </Button>

      <PageHeader
        title={record.case_number}
        description={`${record.case_type} · ${record.court_name}`}
        action={
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={record.status} />
        {record.clients ? (
          <Link
            to="/clients/$clientId"
            params={{ clientId: record.clients.id }}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Client: {record.clients.full_name}
          </Link>
        ) : null}
      </div>

      <Card className="surface-card">
        <CardContent className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Case number" value={record.case_number} />
          <Field label="Case type" value={record.case_type} />
          <Field label="Court" value={record.court_name} />
          <Field label="Filing date" value={fmt(record.filing_date)} />
          <Field label="Next hearing" value={fmt(record.next_hearing)} />
          <Field label="Created" value={fmt(record.created_at)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Description" value={record.description} />
          </div>
        </CardContent>
      </Card>

      {ws ? (
        <CaseFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          workspace={ws}
          caseRecord={record}
        />
      ) : null}
    </div>
  );
}
