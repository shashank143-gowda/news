import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Newspaper, ArrowRight, FileText, FileCheck2, Cpu } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, role } = useRouteContext({ from: "/_authenticated" });

  const { data: newspapers } = useQuery({
    queryKey: ["dash-newspapers"],
    queryFn: async () => {
      const q = supabase.from("newspapers").select("*").order("created_at", { ascending: false }).limit(6);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = {
    total: newspapers?.length ?? 0,
    pending: newspapers?.filter((n) => n.status === "pending_approval").length ?? 0,
    published: newspapers?.filter((n) => n.status === "published").length ?? 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {role === "chief_editor" ? "Chief Editor" : "Editor"} · {user.email}
          </div>
          <h1 className="mt-1 font-serif text-4xl font-bold">Newsroom</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "chief_editor"
              ? "Review, approve, and publish editions from your team."
              : "Draft editions, run the AI pipeline, hand off for approval."}
          </p>
        </div>
        {role === "editor" && (
          <Link to="/editions" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Newspaper className="h-4 w-4" /> Create newspaper
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={FileText} label="Recent editions" value={counts.total} />
        <Stat icon={FileCheck2} label="Pending approval" value={counts.pending} />
        <Stat icon={Cpu} label="Published" value={counts.published} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent editions</h2>
          <Link to="/editions" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {newspapers && newspapers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No editions yet.{" "}
            {role === "editor" ? <Link to="/editions" className="text-primary hover:underline">Create your first edition</Link> : "Editors will submit editions for your review here."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {newspapers?.map((n) => (
              <Link key={n.id} to="/editions/$id" params={{ id: n.id }} className="group flex items-center justify-between rounded-lg border bg-card p-4 hover:border-primary/40 hover:shadow-sm">
                <div className="min-w-0">
                  <div className="font-serif text-lg font-semibold">{n.edition_name}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(n.edition_date), "dd MMM yyyy")} · {n.number_of_pages} pages</div>
                  <div className="mt-2"><StatusBadge status={n.status} /></div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-serif text-3xl font-bold">{value}</div>
    </div>
  );
}
