import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/editions/")({
  component: EditionsList,
});

function EditionsList() {
  const { role, user } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    edition_name: "Prajavani",
    edition_date: new Date().toISOString().slice(0, 10),
    number_of_pages: 1,
    template: "classic",
  });

  const { data: newspapers, isLoading } = useQuery({
    queryKey: ["newspapers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("newspapers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("newspapers").insert({
        ...form, language: "Kannada", status: "draft", created_by: user.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["newspapers"] });
      toast.success("Edition created");
      setOpen(false);
      window.location.href = `/editions/${n.id}`;
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Editions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "editor" ? "Newspaper editions you own." : "All editions across the newsroom."}
          </p>
        </div>
        {role === "editor" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Create newspaper</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New newspaper edition</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Edition name</Label>
                  <Input value={form.edition_name} onChange={(e) => setForm({ ...form, edition_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" value={form.edition_date} onChange={(e) => setForm({ ...form, edition_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Language</Label>
                    <Input value="Kannada" disabled />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Number of pages</Label>
                    <Input type="number" min={1} max={32} value={form.number_of_pages} onChange={(e) => setForm({ ...form, number_of_pages: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Template</Label>
                    <Select value={form.template} onValueChange={(v) => setForm({ ...form, template: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Classic broadsheet</SelectItem>
                        <SelectItem value="modern">Modern compact</SelectItem>
                        <SelectItem value="tabloid">Tabloid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
                  {create.isPending ? "…" : "Create edition"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : newspapers && newspapers.length > 0 ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Edition</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Pages</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {newspapers.map((n) => (
                <tr key={n.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-serif text-base font-semibold">{n.edition_name}</td>
                  <td className="px-4 py-3">{format(new Date(n.edition_date), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">{n.number_of_pages}</td>
                  <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/editions/$id" params={{ id: n.id }} className="inline-flex items-center gap-1 text-primary hover:underline">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No editions yet.
        </div>
      )}
    </div>
  );
}
