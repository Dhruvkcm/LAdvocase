import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type Case = Tables<"cases">;
export type Organization = Tables<"organizations">;
export type Profile = Tables<"profiles">;

export type Workspace = {
  userId: string;
  profile: Profile;
  organization: Organization | null;
  role: string;
  status: "pending" | "approved" | "rejected" | null;
  isOwner: boolean;
  /** organization_id to stamp on new records (null for solo advocates) */
  organizationId: string | null;
};

export async function fetchWorkspace(): Promise<Workspace | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!profile) {
    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: (user.user_metadata?.["full_name"] as string) ?? "",
        email: user.email ?? "",
      })
      .select("*")
      .single();
    profile = created ?? null;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const organization = (membership?.organizations as Organization | null) ?? null;
  const approved = membership?.status === "approved";

  return {
    userId: user.id,
    profile: (profile ?? {
      id: user.id,
      full_name: "",
      email: user.email ?? "",
      created_at: new Date().toISOString(),
    }) as Profile,
    organization,
    role: membership?.role ?? "solo",
    status: membership?.status ?? null,
    isOwner: !!organization && organization.owner_id === user.id,
    organizationId: approved && organization ? organization.id : null,
  };
}

export function useWorkspace() {
  return useQuery({ queryKey: ["workspace"], queryFn: fetchWorkspace, staleTime: 30_000 });
}

/** Scope a select to the current workspace (firm rows, or own rows for solo advocates). */
export function scopeFilter(ws: Workspace) {
  return ws.organizationId
    ? { column: "organization_id" as const, value: ws.organizationId }
    : null;
}

export function generateFirmCode(firmName: string) {
  const letters =
    firmName
      .replace(/[^a-zA-Z ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4) || "FIRM";
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${letters.padEnd(4, "X")}-${year}-${rand}`;
}
