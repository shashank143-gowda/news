// Deterministic priority-based layout planner. No external calls.
// deno-lint-ignore-file
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Article {
  id: string;
  headline?: string;
  summary?: string;
  category?: string;
  priority_score?: number;
  image_url?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { articles, number_of_pages } = await req.json() as { articles: Article[]; number_of_pages: number };
    const sorted = [...articles].sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
    const pages = Math.max(1, number_of_pages || 4);
    const slotsPerPage = 4; // top, mid-left, mid-right, bottom
    const positions = ["top", "middle", "middle", "bottom"];
    const layout: any[] = [];
    sorted.forEach((art, idx) => {
      const page = Math.min(pages, Math.floor(idx / slotsPerPage) + 1);
      const slot = idx % slotsPerPage;
      const isLead = idx === 0 || (slot === 0);
      layout.push({
        article_id: art.id,
        page_number: page,
        position: positions[slot],
        headline_size: isLead ? "big" : slot === 3 ? "small" : "medium",
        image_size: isLead ? "large" : "medium",
        column_count: isLead ? 3 : 2,
        slot_index: slot,
      });
    });
    return new Response(JSON.stringify({ layout, generated_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
