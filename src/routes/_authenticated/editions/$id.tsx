import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Layout as LayoutIcon, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { AddArticleFlow } from "@/components/AddArticleFlow";
import { ArticleCard } from "@/components/ArticleCard";
import { NewspaperLayoutEditor } from "@/components/NewspaperLayoutEditor";
import { getPrintPageCount, NewspaperPage } from "@/components/NewspaperPage";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { aiFn, type Article, type Newspaper } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/editions/$id")({
  component: EditionWorkspace,
});

function EditionWorkspace() {
  const { id } = Route.useParams();
  const { role } = useRouteContext({ from: "/_authenticated" });
  const queryClient = useQueryClient();
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
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("newspaper_id", id)
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Article[];
    },
  });

  const genLayout = useMutation({
    mutationFn: async () => {
      if (!newspaper) return;
      const ready = articles.filter((article) => article.workflow_status?.ready_for_layout);
      if (ready.length === 0) throw new Error("Mark image step complete on at least one article first.");

      const { layout } = await aiFn.layout(ready, newspaper.number_of_pages);
      for (const item of layout) {
        await supabase
          .from("articles")
          .update({
            page_number: item.page_number,
            position: item.position,
            headline_size: item.headline_size,
            image_size: item.image_size,
            column_count: item.column_count,
          })
          .eq("id", item.article_id);
      }
      await supabase.from("layouts").insert({ newspaper_id: id, layout_json: layout });
      await supabase.from("newspapers").update({ status: "pending_layout" }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Layout generated");
      setTab("layout");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Layout generation failed"),
  });

  const sendChief = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("newspapers").update({ status: "pending_approval" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Sent to Chief Editor for review");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not send for review"),
  });

  if (!newspaper) return <div className="text-sm text-muted-foreground">Loading...</div>;

  const laidOut = articles.filter((article) => article.page_number);
  const totalPages = getPrintPageCount(articles, newspaper.number_of_pages);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const canEdit = role === "editor" && !["pending_approval", "approved", "published"].includes(newspaper.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/editions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Editions
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold">{newspaper.edition_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{format(new Date(newspaper.edition_date), "dd MMM yyyy")}</span>
              <span>{newspaper.language}</span>
              <span>{totalPages} pages</span>
              <StatusBadge status={newspaper.status} />
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => genLayout.mutate()} disabled={genLayout.isPending}>
                {genLayout.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LayoutIcon className="mr-2 h-4 w-4" />
                )}
                Generate layout
              </Button>
            )}
            {canEdit && laidOut.length > 0 && (
              <Button onClick={() => sendChief.mutate()} disabled={sendChief.isPending}>
                <Send className="mr-2 h-4 w-4" />
                Send to Chief Editor
              </Button>
            )}
            {newspaper.status === "published" && (
              <Link
                to="/published/$id"
                params={{ id }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                View outputs
              </Link>
            )}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "articles" | "layout" | "preview")}>
        <TabsList>
          <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
          <TabsTrigger value="layout">Layout editor</TabsTrigger>
          <TabsTrigger value="preview">Page preview</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            {articles.length === 0 && (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                No articles yet. Use the panel on the right to add your first article.
              </div>
            )}
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} editable={canEdit} />
            ))}
          </div>
          {canEdit ? (
            <AddArticleFlow newspaperId={id} />
          ) : (
            <div className="text-sm text-muted-foreground">Read-only while edition is under review.</div>
          )}
        </TabsContent>

        <TabsContent value="layout" className="mt-4">
          <NewspaperLayoutEditor articles={articles} pages={pages} newspaperId={id} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4 space-y-6">
          {laidOut.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No layout yet. Click <b>Generate layout</b> above.
            </div>
          ) : (
            pages.map((page) => (
              <div key={page}>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Page {page}
                </div>
                <NewspaperPage newspaper={newspaper} articles={articles} pageNumber={page} totalPages={totalPages} />
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
