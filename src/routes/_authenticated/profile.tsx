import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { ROLE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile | Advocase" },
      { name: "description", content: "Update your advocate profile details." },
      { property: "og:title", content: "Profile | Advocase" },
      { property: "og:description", content: "Update your advocate profile details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: ws, isLoading } = useWorkspace();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (ws) setFullName(ws.profile.full_name ?? "");
  }, [ws]);

  const save = useMutation({
    mutationFn: async () => {
      if (!ws) throw new Error("Not ready");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", ws.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast.success("Profile updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !ws) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account details and workspace role." />

      <Card className="surface-card max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            {ws.organization
              ? `${ws.organization.firm_name} · ${ROLE_LABELS[ws.role] ?? ws.role}`
              : "Solo advocate"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Adv. Riya Mehta"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={ws.profile.email} disabled />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
