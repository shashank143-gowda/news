import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Newspaper, FileCheck2, Cpu, Info, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRouteContext } from "@tanstack/react-router";

export function AppShell({ children }: { children: ReactNode }) {
  const ctx = useRouteContext({ from: "/_authenticated" });
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const role = ctx.role;

  const items = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/editions", label: role === "editor" ? "My Editions" : "Editions", icon: Newspaper, show: true },
    { to: "/review", label: "Review Queue", icon: FileCheck2, show: role === "chief_editor" },
    { to: "/pipeline", label: "AI Pipeline", icon: Cpu, show: true },
    { to: "/about", label: "About Workflow", icon: Info, show: true },
  ].filter((x) => x.show);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <Newspaper className="h-5 w-5 text-primary" />
          <span className="font-serif text-lg font-bold">Prajavani</span>
          <span className="ml-1 text-xs text-sidebar-foreground/60">AI Studio</span>
        </Link>
        <nav className="flex-1 px-2 py-4">
          {items.map((it) => {
            const active = pathname === it.to || (it.to !== "/dashboard" && pathname.startsWith(it.to));
            return (
              <Link key={it.to} to={it.to} className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"}`}>
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs">
          <div className="mb-2 px-2">
            <div className="truncate font-medium">{ctx.user.email}</div>
            <div className="text-sidebar-foreground/60">{role === "chief_editor" ? "Chief Editor" : "Editor"}</div>
          </div>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
