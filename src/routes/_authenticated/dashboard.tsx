import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CalendarClock, Clock, Plus, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { formatCaseNumber } from "@/lib/case";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/EmptyState";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { CaseFormDialog } from "@/components/CaseFormDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Advocase" },
      { name: "description", content: "Clients, cases and upcoming hearings at a glance." },
      { property: "og:title", content: "Dashboard | Advocase" },
      { property: "og:description", content: "Your practice control center." },
    ],
  }),
  component: DashboardPage,
});

const today = () => new Date().toISOString().slice(0, 10);

function DashboardPage() {
  const { data: ws } = useWorkspace();
  const [query, setQuery] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ["dashboard", "clients"],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(5);
  
      if (error) throw error;
  
      return {
        recent: data ?? [],
        total: count ?? 0,
      };
    },
  });
  
  const casesQuery = useQuery({
    queryKey: ["dashboard", "cases"],
    queryFn: async () => {
      const currentDate = today();
  
      const [totalResult, pendingResult, upcomingResult] = await Promise.all([
        supabase
          .from("cases")
          .select("id", { count: "exact", head: true }),
  
        supabase
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
  
        supabase
          .from("cases")
          .select("*, clients(full_name)", { count: "exact" })
          .eq("status", "pending")
          .gte("next_hearing", currentDate)
          .order("next_hearing", { ascending: true })
          .limit(5),
      ]);
  
      if (totalResult.error) throw totalResult.error;
      if (pendingResult.error) throw pendingResult.error;
      if (upcomingResult.error) throw upcomingResult.error;
  
      return {
        total: totalResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        upcoming: upcomingResult.data ?? [],
        upcomingCount: upcomingResult.count ?? 0,
      };
    },
  });

  const clients = clientsQuery.data?.recent ?? [];
const cases = casesQuery.data?.upcoming ?? [];

const totalClients = clientsQuery.data?.total ?? 0;
const totalCases = casesQuery.data?.total ?? 0;
const pendingCases = casesQuery.data?.pending ?? 0;
const upcomingCount = casesQuery.data?.upcomingCount ?? 0;

const loading = clientsQuery.isLoading || casesQuery.isLoading;

const upcoming = useMemo(() => cases, [cases]);

const stats = [
  { label: "Total clients", value: totalClients, icon: Users },
  { label: "Total cases", value: totalCases, icon: Briefcase },
  { label: "Upcoming hearings", value: upcomingCount, icon: CalendarClock },
  {
    label: "Pending cases",
    value: pendingCases,
    icon: Clock,
  },
];

const term = query.trim();

const searchQuery = useQuery({
  queryKey: ["dashboard", "search", term],
  enabled: term.length > 0,
  queryFn: async () => {
    const [clientsResult, casesResult] = await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .or(
          `full_name.ilike.%${term}%,mobile.ilike.%${term}%,email.ilike.%${term}%,district.ilike.%${term}%`,
        )
        .order("created_at", { ascending: false })
        .limit(6),

        supabase
        .from("cases")
        .select("*, clients(full_name)")
        .or(
          `case_code.ilike.%${term}%,case_serial.ilike.%${term}%,court_name.ilike.%${term}%`,
        )
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    if (clientsResult.error) throw clientsResult.error;
    if (casesResult.error) throw casesResult.error;

    return {
      clients: clientsResult.data ?? [],
      cases: casesResult.data ?? [],
    };
  },
});

const matchedClients = searchQuery.data?.clients ?? [];
const matchedCases = searchQuery.data?.cases ?? [];

  const firstName = (ws?.profile.full_name || ws?.profile.email || "").split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <section className="ink-panel rounded-2xl px-6 py-7 shadow-lift sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          {ws?.organization?.firm_name ?? "Solo practice"}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Welcome, {firstName || "Advocate"}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/70">
          Everything happening across your clients, matters and hearings today.
        </p>

        <div className="relative mt-6 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients and cases..."
            className="h-11 bg-background pl-9 text-foreground"
            aria-label="Global search"
          />
        </div>
      </section>

      {term ? (
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Search results for “{query}”</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clients ({matchedClients.length})
              </p>
              <div className="space-y-1">
                {matchedClients.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    to="/clients/$clientId"
                    params={{ clientId: c.id }}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">{c.full_name}</span>
                    <span className="text-muted-foreground">{c.district || c.mobile}</span>
                  </Link>
                ))}
                {matchedClients.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No matching clients.</p>
                ) : null}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cases ({matchedCases.length})
              </p>
              <div className="space-y-1">
                {matchedCases.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    to="/cases/$caseId"
                    params={{ caseId: c.id }}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">
  {formatCaseNumber(
    c.case_code,
    c.case_serial,
    c.case_year,
  )}
</span>
                    <span className="text-muted-foreground">
                      {c.clients?.full_name} · {c.court_name}
                    </span>
                  </Link>
                ))}
                {matchedCases.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No matching cases.</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="surface-card transition-shadow hover:shadow-lift">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-12" />
                ) : (
                  <p className="mt-1 font-display text-3xl">{stat.value}</p>
                )}
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <stat.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        <Button onClick={() => setClientOpen(true)}>
          <Plus className="size-4" /> Add client
        </Button>
        <Button variant="secondary" onClick={() => setCaseOpen(true)}>
          <Plus className="size-4" /> Add case
        </Button>
        <Button variant="outline" asChild>
          <Link to="/clients">View clients</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/cases">View cases</Link>
        </Button>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent clients</CardTitle>
            <Link to="/clients" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No clients yet"
                description="Add your first client to start building your case book."
                action={<Button onClick={() => setClientOpen(true)}>Add client</Button>}
              />
            ) : (
              <ul className="divide-y divide-border">
                {clients.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: c.id }}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.mobile || "No mobile"} · {c.district || "No district"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Upcoming hearings</CardTitle>
            <Link to="/cases" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No hearings scheduled"
                description="Hearings you add to a case will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {upcoming.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/cases/$caseId"
                      params={{ caseId: c.id }}
                      className="block rounded-xl border border-border p-3 transition-shadow hover:shadow-card"
                    >
                      <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">
  {formatCaseNumber(
    c.case_code,
    c.case_serial,
    c.case_year,
  )}
</p>
                        <span className="text-xs font-medium text-muted-foreground">
                          {new Date(c.next_hearing!).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.clients?.full_name} · {c.court_name}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {ws ? (
        <>
          <ClientFormDialog open={clientOpen} onOpenChange={setClientOpen} workspace={ws} />
          <CaseFormDialog open={caseOpen} onOpenChange={setCaseOpen} workspace={ws} />
        </>
      ) : null}
    </div>
  );
}
