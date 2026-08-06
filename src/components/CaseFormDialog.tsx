import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CASE_TYPES, COURTS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import type { Case, Workspace } from "@/lib/workspace";

const empty = {
  client_id: "",
  case_number: "",
  court_name: "",
  case_type: "",
  filing_date: "",
  next_hearing: "",
  status: "pending",
  description: "",
};

export function CaseFormDialog({
  open,
  onOpenChange,
  workspace,
  caseRecord,
  defaultClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  caseRecord?: Case | null;
  defaultClientId?: string;
}) {
  const [form, setForm] = useState(empty);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      caseRecord
        ? {
            client_id: caseRecord.client_id,
            case_number: caseRecord.case_number,
            court_name: caseRecord.court_name,
            case_type: caseRecord.case_type,
            filing_date: caseRecord.filing_date ?? "",
            next_hearing: caseRecord.next_hearing ?? "",
            status: caseRecord.status,
            description: caseRecord.description,
          }
        : { ...empty, client_id: defaultClientId ?? "" },
    );
  }, [open, caseRecord, defaultClientId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error("Please select a client");
      if (!form.case_number.trim()) throw new Error("Case number is required");
      if (!form.court_name) throw new Error("Please select a court");
      if (!form.case_type) throw new Error("Please select a case type");

      const payload = {
        client_id: form.client_id,
        case_number: form.case_number.trim(),
        court_name: form.court_name,
        case_type: form.case_type,
        filing_date: form.filing_date || null,
        next_hearing: form.next_hearing || null,
        status: form.status as "pending" | "disposed",
        description: form.description,
      };

      if (caseRecord) {
        const { error } = await supabase.from("cases").update(payload).eq("id", caseRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cases").insert({
          ...payload,
          owner_id: workspace.userId,
          organization_id: workspace.organizationId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case"] });
      toast.success(caseRecord ? "Case updated" : "Case added");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{caseRecord ? "Edit case" : "Add case"}</DialogTitle>
          <DialogDescription>Link the matter to a client and track hearings.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Client</Label>
              <SearchableSelect
                options={clients.map((c) => ({ value: c.id, label: c.full_name }))}
                value={form.client_id}
                onChange={(client_id) => setForm({ ...form, client_id })}
                placeholder="Select client"
                searchPlaceholder="Search clients..."
                emptyText="No clients yet."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="case_number">Case number</Label>
              <Input
                id="case_number"
                maxLength={80}
                value={form.case_number}
                onChange={(e) => setForm({ ...form, case_number: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Court name</Label>
              <Select
                value={form.court_name}
                onValueChange={(court_name) => setForm({ ...form, court_name })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent>
                  {COURTS.map((court) => (
                    <SelectItem key={court} value={court}>
                      {court}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Case type</Label>
              <Select
                value={form.case_type}
                onValueChange={(case_type) => setForm({ ...form, case_type })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="filing_date">Filing date</Label>
              <Input
                id="filing_date"
                type="date"
                value={form.filing_date}
                onChange={(e) => setForm({ ...form, filing_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="next_hearing">Next hearing</Label>
              <Input
                id="next_hearing"
                type="date"
                value={form.next_hearing}
                onChange={(e) => setForm({ ...form, next_hearing: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              maxLength={4000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : caseRecord ? "Save changes" : "Add case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
