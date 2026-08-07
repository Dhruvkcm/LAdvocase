import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Copy, LogIn, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateFirmCode, useWorkspace } from "@/lib/workspace";
import { ROLE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/organization")({
  head: () => ({
    meta: [
      { title: "Organization | Advocase" },
      { name: "description", content: "Create a law firm, invite advocates and approve requests." },
      { property: "og:title", content: "Organization | Advocase" },
      { property: "og:description", content: "Manage your firm and its members." },
    ],
  }),
  component: OrganizationPage,
});

type MemberRow = {
  id: string;
  role: string;
  status: string;
  user_id: string;
  joined_at: string;
  full_name: string;
  email: string;
};

function OrganizationPage() {
  const { data: ws, isLoading } = useWorkspace();
  const queryClient = useQueryClient();
  const [firmName, setFirmName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const orgId = ws?.organization?.id ?? null;

  const { data: members = [] } = useQuery({
    queryKey: ["members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("org_members_detailed", {
        _org: orgId!,
      });
  
      if (error) throw error;
  
      return data as MemberRow[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["workspace"] });
    queryClient.invalidateQueries({ queryKey: ["members"] });
  };

  const createFirm = useMutation({
    mutationFn: async () => {
      if (!ws) throw new Error("Not ready");
      const name = firmName.trim();
      if (!name) throw new Error("Firm name is required");
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({ firm_name: name, firm_code: generateFirmCode(name), owner_id: ws.userId })
        .select("*")
        .single();
      if (error) throw error;
      const { error: memberError } = await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: ws.userId,
        role: "owner",
        status: "approved",
      });
      if (memberError) throw memberError;
    },
    onSuccess: () => {
      setFirmName("");
      refresh();
      toast.success("Firm created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinFirm = useMutation({
    mutationFn: async () => {
      if (!ws) throw new Error("Not ready");
      const code = joinCode.trim().toUpperCase();
      if (!code) throw new Error("Enter a firm code");
      const { data, error } = await supabase.rpc(
        "find_firm_by_code",
        {
          _code: code,
        },
      );
      
      if (error) throw error;
      
      const org = data?.[0];
      
      if (!org) {
        throw new Error("No firm found with that code");
      }
      const { error: joinError } = await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: ws.userId,
        role: "advocate",
        status: "pending",
      });
      if (joinError) throw joinError;
    },
    onSuccess: () => {
      setJoinCode("");
      refresh();
      toast.success("Join request sent — waiting for owner approval");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Membership updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !ws) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!ws.organization) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Organization"
          description="Work solo, start a firm, or join an existing one."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Create a law firm</CardTitle>
              <CardDescription>
                You become the owner and get a shareable firm code for your advocates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firm-name">Firm name</Label>
                <Input
                  id="firm-name"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Mehta & Associates"
                />
              </div>
              <Button onClick={() => createFirm.mutate()} disabled={createFirm.isPending}>
                <Building2 className="size-4" /> Create firm
              </Button>
            </CardContent>
          </Card>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Join a firm</CardTitle>
              <CardDescription>
                Enter the firm code shared by the owner. They approve your request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firm-code">Firm code</Label>
                <Input
                  id="firm-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="MEHT-2026-1234"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => joinFirm.mutate()}
                disabled={joinFirm.isPending}
              >
                <LogIn className="size-4" /> Request to join
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pending = members.filter((m) => m.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title={ws.organization.firm_name}
        description={ws.isOwner ? "You own this firm." : ROLE_LABELS[ws.role] ?? "Firm member"}
        action={
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(ws.organization!.firm_code);
              toast.success("Firm code copied");
            }}
          >
            <Copy className="size-4" /> {ws.organization.firm_code}
          </Button>
        }
      />

      {ws.status === "pending" ? (
        <Card className="surface-card border-brand/40">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Your membership is awaiting approval from the firm owner. You will see firm data once
            approved.
          </CardContent>
        </Card>
      ) : null}

      {ws.isOwner ? (
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Join requests ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.full_name || "Advocate"}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setStatus.mutate({ id: m.id, status: "approved" })}
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus.mutate({ id: m.id, status: "rejected" })}
                      >
                        <X className="size-4" /> Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <EmptyState icon={Building2} title="No members yet" />
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                    {m.full_name || "Advocate"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                    {m.email} · {ROLE_LABELS[m.role] ?? m.role}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
