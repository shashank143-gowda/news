import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Newspaper } from "lucide-react";
import { toast } from "sonner";

const search = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => search.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"editor" | "chief_editor">("editor");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" className="flex items-center gap-2">
          <Newspaper className="h-6 w-6" />
          <span className="font-serif text-xl font-bold">Prajavani AI Studio</span>
        </Link>
        <div>
          <blockquote className="font-serif text-2xl leading-snug">
            "The AI handles OCR, correction, headlines, summaries, categorisation, priority, images and layout. The editor keeps the voice."
          </blockquote>
          <div className="mt-4 text-sm text-sidebar-foreground/70">— Prajavani Newsroom Playbook</div>
        </div>
        <div className="rounded-lg border border-sidebar-border/50 bg-sidebar-accent/40 p-4 text-xs">
          <div className="font-semibold uppercase tracking-wider text-sidebar-foreground/70">Demo</div>
          <div className="mt-2">Sign up with any email. Pick <b>Editor</b> to build editions, or <b>Chief Editor</b> to review the queue.</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Newspaper className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold">Prajavani AI Studio</span>
          </div>
          <div className="flex rounded-md border p-1 text-sm">
            <button onClick={() => setTab("signin")} className={`flex-1 rounded px-3 py-1.5 font-medium ${tab === "signin" ? "bg-primary text-primary-foreground" : ""}`}>Sign in</button>
            <button onClick={() => setTab("signup")} className={`flex-1 rounded px-3 py-1.5 font-medium ${tab === "signup" ? "bg-primary text-primary-foreground" : ""}`}>Sign up</button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {tab === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="chief_editor">Chief Editor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "…" : tab === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
