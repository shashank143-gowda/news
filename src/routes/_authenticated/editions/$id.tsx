import { createFileRoute, Link, useRouteContext, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { aiFn, type Article, type Newspaper } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { AddArticleFlow } from "@/components/AddArticleFlow";
import { ArticleCard } from "@/components/ArticleCard";
import { NewspaperPage } from "@/components/NewspaperPage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Layout as LayoutIcon, Send, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/editions/$id")({
  component: EditionWorkspace,
});

function EditionWorkspace() {
  const { id } = Route.useParams();
  const { role } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"articles" | "layout" | "preview">("articles");

  const { data: newspaper } = useQuery({
    queryKey: ["newspaper", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("newspapers").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Newspaper;
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["articles", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("newspaper_id", id).order("priority_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Article[];
    },
  });

  const genLayout = useMutation({
    mutationFn: async () => {
      if (!newspaper) return;
      const ready = articles.filter((a) => a.workflow_status?.ready_for_layout);
      if (ready.length === 0) throw new Error("Mark image step complete on at least one article first.");
      const { layout } = await aiFn.layout(ready, newspaper.number_of_pages);
      for (const l of layout) {
        await supabase.from("articles").update({
          page_number: l.page_number,
          position: l.position,
          headline_size: l.headline_size,
          image_size: l.image_size,
          column_count: l.column_count,
        }).eq("id", l.article_id);
      }
      await supabase.from("layouts").insert({ newspaper_id: id, layout_json: layout });
      await supabase.from("newspapers").update({ status: "pending_layout" }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Layout generated");
      setTab("preview");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendChief = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("newspapers").update({ status: "pending_approval" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Sent to Chief Editor for review"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!newspaper) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const pages = Array.from({ length: newspaper.number_of_pages }, (_, i) => i + 1);
  const laidOut = articles.filter((a) => a.page_number);

  const canEdit = role === "editor" && !["pending_approval", "approved", "published"].includes(newspaper.status);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/editions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Editions
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold">{newspaper.edition_name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{format(new Date(newspaper.edition_date), "dd MMM yyyy")}</span>
              <span>·</span>
              <span>{newspaper.language}</span>
              <span>·</span>
              <span>{newspaper.number_of_pages} pages</span>
              <StatusBadge status={newspaper.status} />
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => genLayout.mutate()} disabled={genLayout.isPending}>
                {genLayout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LayoutIcon className="mr-2 h-4 w-4" />}
                Generate layout
              </Button>
            )}
            {canEdit && laidOut.length > 0 && (
              <Button onClick={() => sendChief.mutate()} disabled={sendChief.isPending}>
                <Send className="mr-2 h-4 w-4" /> Send to Chief Editor
              </Button>
            )}
            {newspaper.status === "published" && (
              <Link to="/published/$id" params={{ id }} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">View outputs</Link>
            )}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
          <TabsTrigger value="layout">Layout editor</TabsTrigger>
          <TabsTrigger value="preview">Page preview</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            {articles.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No articles yet. Use the panel on the right to add your first article.</div>}
            {articles.map((a) => <ArticleCard key={a.id} article={a} editable={canEdit} />)}
          </div>
          {canEdit ? <AddArticleFlow newspaperId={id} /> : <div className="text-sm text-muted-foreground">Read-only while edition is under review.</div>}
        </TabsContent>

        <TabsContent value="layout" className="mt-4">
          <LayoutEditor articles={articles} pages={pages} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4 space-y-6">
          {laidOut.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No layout yet. Click <b>Generate layout</b> above.
            </div>
          ) : (
            pages.map((p) => (
              <div key={p}>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Page {p}</div>
                <NewspaperPage newspaper={newspaper} articles={articles} pageNumber={p} />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LayoutEditor({ articles, pages, canEdit }: { articles: Article[]; pages: number[]; canEdit: boolean }) {
  const qc = useQueryClient();

  async function move(id: string, targetPage: number) {
    await supabase.from("articles").update({ page_number: targetPage }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["articles"] });
  }

  async function updateSize(id: string, field: string, value: any) {
    await supabase.from("articles").update({ [field]: value } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["articles"] });
  }

  const laidOut = articles.filter((a) => a.page_number);
  if (laidOut.length === 0) {
    return <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Generate a layout to start editing.</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {pages.map((p) => {
        const onPage = laidOut.filter((a) => a.page_number === p);
        return (
          <div key={p} className="rounded-lg border bg-card p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page {p}</div>
            <div className="space-y-2">
              {onPage.length === 0 && <div className="rounded border border-dashed p-4 text-center text-xs italic text-muted-foreground">— Ad space —</div>}
              {onPage.map((a) => (
                <div key={a.id} className="rounded border bg-background p-2 text-sm">
                  <div className="line-clamp-1 font-kannada font-semibold">{a.headline}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{a.category} · P{a.priority_score} · {a.headline_size}</div>
                  {canEdit && (
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                      <select className="rounded border bg-background px-1 py-0.5" value={a.page_number ?? p} onChange={(e) => move(a.id, Number(e.target.value))}>
                        {pages.map((pg) => <option key={pg} value={pg}>Page {pg}</option>)}
                      </select>
                      <select className="rounded border bg-background px-1 py-0.5" value={a.headline_size ?? "medium"} onChange={(e) => updateSize(a.id, "headline_size", e.target.value)}>
                        <option value="big">Big</option><option value="medium">Med</option><option value="small">Small</option>
                      </select>
                      <select className="rounded border bg-background px-1 py-0.5" value={a.column_count ?? 2} onChange={(e) => updateSize(a.id, "column_count", Number(e.target.value))}>
                        <option value={1}>1 col</option><option value={2}>2 col</option><option value={3}>3 col</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
