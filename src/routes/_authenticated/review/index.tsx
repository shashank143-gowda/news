import { createFileRoute, Link, useRouteContext, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/review/")({
  beforeLoad: ({ context }) => {
    if (context.role !== "chief_editor") throw redirect({ to: "/dashboard" });
  },
  component: ReviewQueue,
});

function ReviewQueue() {
  const { data: queue = [] } = useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const { data, error } = await supabase.from("newspapers")
        .select("*")
        .in("status", ["pending_approval"])
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Editions awaiting your approval.</p>
      </div>
      {queue.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Nothing waiting. Everything is on the press or already out.</div>
      ) : (
        <div className="grid gap-3">
          {queue.map((n) => (
            <Link key={n.id} to="/review/$id" params={{ id: n.id }} className="flex items-center justify-between rounded-lg border bg-card p-4 hover:border-primary/40">
              <div>
                <div className="font-serif text-lg font-semibold">{n.edition_name}</div>
                <div className="text-sm text-muted-foreground">{format(new Date(n.edition_date), "dd MMM yyyy")} · {n.number_of_pages} pages</div>
              </div>
              <StatusBadge status={n.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
