import { useState } from "react";
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

  const PAGE_SIZE = 25;

const [page, setPage] = useState(0);

const { data: casesResult, isLoading } = useQuery({
  queryKey: ["cases", page, term, status],
  queryFn: async () => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const search = term.trim();
  
    let query = supabase
      .from("cases")
      .select("*, clients(full_name)", { count: "exact" })
      .order("created_at", { ascending: false });
  
      if (status !== "all") {
        query = query.eq("status", status as Case["status"]);
      }
  
    if (search) {
      const { data: matchingClients, error: clientSearchError } = await supabase
        .from("clients")
        .select("id")
        .ilike("full_name", `%${search}%`);
  
      if (clientSearchError) throw clientSearchError;
  
      const clientIds = (matchingClients ?? []).map((client) => client.id);
  
      const searchConditions = [
        `case_code.ilike.%${search}%`,
        `case_serial.ilike.%${search}%`,
        `court_name.ilike.%${search}%`,
      ];
  
      if (clientIds.length > 0) {
        searchConditions.push(`client_id.in.(${clientIds.join(",")})`);
      }
  
      query = query.or(searchConditions.join(","));
    }
  
    const { data, error, count } = await query.range(from, to);
  
    if (error) throw error;
  
    return {
      cases: (data ?? []) as CaseRow[],
      count: count ?? 0,
    };
  },
});

const cases = casesResult?.cases ?? [];
const totalCases = casesResult?.count ?? 0;
const totalPages = Math.ceil(totalCases / PAGE_SIZE);

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
  maxLength={100}
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(0);
            }}
            placeholder="Search case number, court or client"
            className="pl-9"
          />
        </div>
        <Select
  value={status}
  onValueChange={(value) => {
    setStatus(value);
    setPage(0);
  }}
>
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
      ) : cases.length === 0 ? (
        <EmptyState
  icon={Briefcase}
  title={
    term.trim() || status !== "all"
      ? "No matching cases"
      : "No cases yet"
  }
  description={
    term.trim() || status !== "all"
      ? "Adjust your filters or search term."
      : "Create your first case to start tracking hearings."
  }
  action={
    !term.trim() && status === "all" ? (
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
            {cases.map((c) => (
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
