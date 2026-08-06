import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, CalendarClock, Scale, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Advocase — Case Management for Advocates" },
      {
        name: "description",
        content:
          "Advocase helps solo advocates and law firms manage clients, cases, courts and hearing dates in one calm workspace.",
      },
      { property: "og:title", content: "Advocase — Case Management for Advocates" },
      {
        property: "og:description",
        content: "Advocase helps solo advocates and law firms manage clients, cases, courts and hearing dates in one calm workspace.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Users,
    title: "Client register",
    body: "Every client, contact detail and district in one searchable list.",
  },
  {
    icon: Scale,
    title: "Case tracking",
    body: "Case numbers, courts, filing dates and status — always current.",
  },
  {
    icon: CalendarClock,
    title: "Hearing dates",
    body: "Upcoming hearings surface on your dashboard so nothing slips.",
  },
  {
    icon: Building2,
    title: "Firm workspaces",
    body: "Invite advocates with a firm code and approve them as owner.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="size-5" />
          </span>
          <span className="font-display text-2xl">Advocase</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
          <div className="ink-panel rounded-3xl px-6 py-14 shadow-lift sm:px-14 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              For solo advocates and law firms
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl">
              The quiet, precise home for your practice.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/70">
              Advocase keeps your clients, matters, courts and hearing dates in order — so your
              attention stays on the argument, not the admin.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Get started <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-20">
          <h2 className="font-display text-3xl">Everything a chamber needs</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="surface-card p-6 transition-shadow hover:shadow-lift">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-24">
          <div className="surface-card flex flex-wrap items-center justify-between gap-6 p-8">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-2xl">Client data stays yours</h2>
                <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                  Row-level security separates every practice and firm, so your records are visible
                  only to you and the advocates you approve.
                </p>
              </div>
            </div>
            <Button asChild size="lg">
              <Link to="/auth">Create your workspace</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Advocase. Built for advocates.
        </div>
      </footer>
    </div>
  );
}
