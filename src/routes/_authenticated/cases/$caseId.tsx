import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, Pencil, Plus, CalendarDays, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace, type Case } from "@/lib/workspace";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseFormDialog } from "@/components/CaseFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCaseNumber } from "@/lib/case";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [addHearingOpen, setAddHearingOpen] = useState(false);
  const [hearingDate, setHearingDate] = useState("");
const [hearingNote, setHearingNote] = useState("");
const [hearingSaving, setHearingSaving] = useState(false);
const [editingHearingId, setEditingHearingId] = useState<string | null>(null);
const [editingHearingNote, setEditingHearingNote] = useState("");
const handleAddHearing = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (!hearingDate) return;

  setHearingSaving(true);

  try {
    const { error } = await supabase.from("case_hearing_history").insert({
      case_id: caseId,
      hearing_date: hearingDate,
      hearing_note: hearingNote.trim() || null,
    });

    if (error) throw error;

    await queryClient.invalidateQueries({
      queryKey: ["case-hearing-history", caseId],
    });

    setHearingDate("");
    setHearingNote("");
    setAddHearingOpen(false);
    toast.success("Hearing added");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Failed to add hearing",
    );
  } finally {
    setHearingSaving(false);
  }
};
const handleUpdateHearingNote = async (
  event: React.FormEvent<HTMLFormElement>,
  hearingId: string,
) => {
  event.preventDefault();

  setHearingSaving(true);

  try {
    const { error } = await supabase
      .from("case_hearing_history")
      .update({
        hearing_note: editingHearingNote.trim() || null,
      })
      .eq("id", hearingId)
      .eq("case_id", caseId);

    if (error) throw error;

    await queryClient.invalidateQueries({
      queryKey: ["case-hearing-history", caseId],
    });

    setEditingHearingId(null);
    setEditingHearingNote("");
    toast.success("Hearing note updated");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Failed to update hearing note",
    );
  } finally {
    setHearingSaving(false);
  }
};
  const { data: record, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*, clients(id, full_name)")
        .eq("id", caseId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CaseRow | null;
    },
  });
  const { data: hearingHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["case-hearing-history", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("case_hearing_history")
        .select("id, hearing_date, hearing_note, created_at")
        .eq("case_id", caseId)
        .order("hearing_date", { ascending: false })
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
  title={formatCaseNumber(
    record.case_code,
    record.case_serial,
    record.case_year
  )}
  description={record.court_name}
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
        <Field
  label="Case Number"
  value={formatCaseNumber(
    record.case_code,
    record.case_serial,
    record.case_year
  )}
/>
<Field label="Court" value={record.court_name} />

<Field
  label="Ref. Advocate"
  value={record.reference_advocate_name ?? "—"}
/>

<Field
  label="Ref. Mobile"
  value={record.reference_advocate_mobile ?? "—"}
/>

<Field
  label="Opp. Advocate"
  value={record.opposing_advocate_name ?? "—"}
/>

<Field
  label="Opp. Mobile"
  value={record.opposing_advocate_mobile ?? "—"}
/>

<Field label="Filing date" value={fmt(record.filing_date)} />
<Field label="Next hearing" value={fmt(record.next_hearing)} />
<Field label="Created" value={fmt(record.created_at)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Description" value={record.description} />
          </div>
        </CardContent>
      </Card>
      <Card className="surface-card">
        <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
  <h2 className="text-lg font-semibold text-foreground">
    Hearing History
  </h2>
  <Button onClick={() => setAddHearingOpen(true)}>
    <Plus className="size-4" />
    Add Hearing
  </Button>
</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Previously scheduled and upcoming hearing dates for this case.
          </p>

          {historyLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : hearingHistory.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No hearing history recorded yet.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {hearingHistory.map((hearing) => (
                <div
                key={hearing.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {fmt(hearing.hearing_date)}
                  </p>
              
                  {editingHearingId === hearing.id ? (
                    <form
                      className="mt-3 space-y-3"
                      onSubmit={(event) => handleUpdateHearingNote(event, hearing.id)}
                    >
                      <Textarea
                        value={editingHearingNote}
                        onChange={(event) => setEditingHearingNote(event.target.value)}
                        placeholder="Add hearing observations, orders, or next steps..."
                        rows={3}
                        aria-label="Edit hearing note"
                      />
              
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={hearingSaving}>
                          <Save className="size-4" />
                          {hearingSaving ? "Saving..." : "Save Note"}
                        </Button>
              
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={hearingSaving}
                          onClick={() => {
                            setEditingHearingId(null);
                            setEditingHearingNote("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {hearing.hearing_note ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {hearing.hearing_note}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No note added
                        </p>
                      )}
              
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 -ml-3"
                        onClick={() => {
                          setEditingHearingId(hearing.id);
                          setEditingHearingNote(hearing.hearing_note ?? "");
                        }}
                      >
                        <Pencil className="size-4" />
                        Edit Note
                      </Button>
                    </>
                  )}
                </div>
              
                <span className="shrink-0 text-xs text-muted-foreground">
                  Recorded {fmt(hearing.created_at)}
                </span>
              </div>
              ))}
            </div>
                 )}
                 </CardContent>
               </Card>
           
               <Dialog open={addHearingOpen} onOpenChange={setAddHearingOpen}>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>Add Hearing</DialogTitle>
                     <DialogDescription>
                       Record a hearing date and optionally describe what happened or what
                       needs to happen next.
                     </DialogDescription>
                   </DialogHeader>
           
                   <form onSubmit={handleAddHearing} className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="hearing-date">Hearing date</Label>
                       <Input
                         id="hearing-date"
                         type="date"
                         value={hearingDate}
                         onChange={(event) => setHearingDate(event.target.value)}
                         required
                       />
                     </div>
           
                     <div className="space-y-2">
                       <Label htmlFor="hearing-note">Hearing note (optional)</Label>
                       <Textarea
                         id="hearing-note"
                         placeholder="Add hearing observations, orders, or next steps..."
                         value={hearingNote}
                         onChange={(event) => setHearingNote(event.target.value)}
                         rows={4}
                       />
                     </div>
           
                     <DialogFooter>
                       <Button
                         type="button"
                         variant="outline"
                         onClick={() => setAddHearingOpen(false)}
                         disabled={hearingSaving}
                       >
                         Cancel
                       </Button>
                       <Button type="submit" disabled={hearingSaving || !hearingDate}>
                         <Save className="size-4" />
                         {hearingSaving ? "Saving..." : "Save Hearing"}
                       </Button>
                     </DialogFooter>
                   </form>
                 </DialogContent>
               </Dialog>
           
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
