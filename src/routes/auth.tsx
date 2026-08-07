import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | Advocase" },
      { name: "description", content: "Sign in or create your Advocase advocate account." },
      { property: "og:title", content: "Sign in | Advocase" },
      { property: "og:description", content: "Access your case management workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  const signUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) toast.success("Check your email to confirm your account.");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="ink-panel hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Scale className="size-5" />
          </span>
          <span className="font-display text-2xl">Advocase</span>
        </div>
        <div>
          <h2 className="font-display text-4xl leading-tight">
            The case book your practice deserves.
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Clients, matters, courts and hearing dates — organised for solo advocates and law firms
            alike.
          </p>
        </div>
        <p className="text-xs text-white/40">Built for advocates across Gujarat.</p>
      </div>

      <div className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl">Welcome to Advocase</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your workspace or create an account.
          </p>

          <Tabs defaultValue="signin" className="mt-8">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@chambers.in"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button className="w-full" onClick={signIn} disabled={loading}>
                Sign in
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full name</Label>
                <Input
                  id="signup-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adv. Riya Mehta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@chambers.in"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <Button className="w-full" onClick={signUp} disabled={loading}>
                Create account
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
