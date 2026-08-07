import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type Case } from "@/lib/workspace";
import { CASE_STATUSES } from "@/lib/constants";
import { formatCaseNumber } from "@/lib/case";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseFormDialog } from "@/components/CaseFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/cases/")({
  head: () => ({
    meta: [
      { title: "Cases | Advocase" },
      { name: "description", content: "Track every matter, court and hearing date." },
      { property: "og:title", content: "Cases | Advocase" },
      { property: "og:description", content: "Filter cases by status, type and client." },
    ],
  }),
  component: CasesPage,
});

type CaseRow = Case & { clients: { full_name: string } | null };

function CasesPage() {
  const { data: ws } = useWorkspace();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Case | null>(null);
  const [deleting, setDeleting] = useState<CaseRow | null>(null);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*, clients(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CaseRow[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Case deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return cases.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return [
        formatCaseNumber(
          c.case_code,
          c.case_serial,
          c.case_year,
        ),
        c.court_name,
        c.clients?.full_name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [cases, term, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        description="Every matter you are handling, with hearing dates."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add case
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search case number, court or client"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[10rem]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CASE_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={cases.length === 0 ? "No cases yet" : "No matching cases"}
          description={
            cases.length === 0
              ? "Create your first case to start tracking hearings."
              : "Adjust your filters or search term."
          }
          action={
            cases.length === 0 ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add case
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Court</TableHead>
                <TableHead className="hidden lg:table-cell">Next hearing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="transition-colors hover:bg-muted/60">
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
                  <TableCell className="text-muted-foreground">
                    {c.clients?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.court_name}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {c.next_hearing
                      ? new Date(c.next_hearing).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild aria-label="View case">
                        <Link to="/cases/$caseId" params={{ caseId: c.id }}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit case"
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete case"
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {ws ? (
        <CaseFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          workspace={ws}
          caseRecord={editing}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete case ${deleting
          ? formatCaseNumber(
              deleting.case_code,
              deleting.case_serial,
              deleting.case_year
            )
          : ""
        }?`}
        description="This permanently removes the case record."
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
