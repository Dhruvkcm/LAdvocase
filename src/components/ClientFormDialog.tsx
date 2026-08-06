import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { SearchableSelect } from "@/components/SearchableSelect";
import { GUJARAT_DISTRICTS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import type { Client, Workspace } from "@/lib/workspace";

const empty = { full_name: "", mobile: "", email: "", district: "", notes: "" };

export function ClientFormDialog({
  open,
  onOpenChange,
  workspace,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  client?: Client | null;
}) {
  const [form, setForm] = useState(empty);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(
      client
        ? {
            full_name: client.full_name,
            mobile: client.mobile,
            email: client.email,
            district: client.district,
            notes: client.notes,
          }
        : empty,
    );
  }, [open, client]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Full name is required");
      if (client) {
        const { error } = await supabase
          .from("clients")
          .update({ ...form, full_name: form.full_name.trim() })
          .eq("id", client.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert({
          ...form,
          full_name: form.full_name.trim(),
          owner_id: workspace.userId,
          organization_id: workspace.organizationId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      toast.success(client ? "Client updated" : "Client added");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>
            Client records are shared with your firm workspace.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              maxLength={120}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                inputMode="tel"
                maxLength={20}
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>District</Label>
            <SearchableSelect
              options={GUJARAT_DISTRICTS.map((d) => ({ value: d, label: d }))}
              value={form.district}
              onChange={(district) => setForm({ ...form, district })}
              placeholder="Select district"
              searchPlaceholder="Search districts..."
              emptyText="No district found."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : client ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
