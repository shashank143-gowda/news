import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownUp,
  Columns3,
  FileDown,
  GripVertical,
  Image,
  LayoutTemplate,
  Lock,
  Maximize2,
  Minimize2,
  Monitor,
  PanelTop,
  Plus,
  Redo2,
  RotateCcw,
  Rows3,
  Save,
  Smartphone,
  Trash2,
  Type,
  Undo2,
  Unlock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Article } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SlotKind = "lead" | "story" | "image" | "ad" | "sidebar";
type PreviewMode = "print" | "pdf" | "mobile";

type LayoutSlot = {
  id: string;
  label: string;
  kind: SlotKind;
  x: number;
  y: number;
  w: number;
  h: number;
  locked?: boolean;
};

type LayoutTemplateDef = {
  id: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  slots: LayoutSlot[];
};

type SlotAssignment = {
  articleId?: string;
  ad?: {
    title: string;
    size: string;
  };
};

type LayoutState = {
  templateId: string;
  slots: LayoutSlot[];
  assignments: Record<string, SlotAssignment>;
  rowScale: number;
  columnScale: number;
  gutter: number;
};

type FittingPlan = {
  headlineSize: number;
  bodySize: number;
  imageHeight: number;
  columns: number;
  spacing: number;
};

const PAGE_WIDTH = 780;
const PAGE_HEIGHT = 1084;
const GRID_COLUMNS = 12;
const GRID_ROWS = 18;

const TEMPLATE_DEFS: LayoutTemplateDef[] = [
  {
    id: "classic_front",
    name: "Classic Front",
    description: "Lead banner, four balanced stories, bottom ad rail.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "lead", label: "Lead story", kind: "lead", x: 1, y: 1, w: 12, h: 5 },
      { id: "left_top", label: "Left column", kind: "story", x: 1, y: 6, w: 4, h: 5 },
      { id: "center_top", label: "Center column", kind: "story", x: 5, y: 6, w: 4, h: 5 },
      { id: "right_top", label: "Right column", kind: "story", x: 9, y: 6, w: 4, h: 5 },
      { id: "wide_bottom", label: "Wide analysis", kind: "story", x: 1, y: 11, w: 8, h: 5 },
      { id: "briefs", label: "Briefs", kind: "sidebar", x: 9, y: 11, w: 4, h: 5 },
      { id: "ad_bottom", label: "Bottom advertisement", kind: "ad", x: 1, y: 16, w: 12, h: 3 },
    ],
  },
  {
    id: "metro_grid",
    name: "Metro Grid",
    description: "Dense city-news rhythm with equal snap blocks.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "hero", label: "Hero", kind: "lead", x: 1, y: 1, w: 8, h: 6 },
      { id: "sky_ad", label: "Sky ad", kind: "ad", x: 9, y: 1, w: 4, h: 3 },
      { id: "quick_take", label: "Quick take", kind: "sidebar", x: 9, y: 4, w: 4, h: 3 },
      { id: "story_a", label: "Story A", kind: "story", x: 1, y: 7, w: 4, h: 5 },
      { id: "story_b", label: "Story B", kind: "story", x: 5, y: 7, w: 4, h: 5 },
      { id: "story_c", label: "Story C", kind: "story", x: 9, y: 7, w: 4, h: 5 },
      { id: "photo_strip", label: "Photo strip", kind: "image", x: 1, y: 12, w: 12, h: 4 },
      { id: "bottom_note", label: "Bottom note", kind: "story", x: 1, y: 16, w: 12, h: 3 },
    ],
  },
  {
    id: "editorial_depth",
    name: "Editorial Depth",
    description: "Long-form opinion layout with sidebar context.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "main_opinion", label: "Main opinion", kind: "lead", x: 1, y: 1, w: 7, h: 9 },
      { id: "portrait", label: "Portrait story", kind: "image", x: 8, y: 1, w: 5, h: 5 },
      { id: "fact_box", label: "Fact box", kind: "sidebar", x: 8, y: 6, w: 5, h: 4 },
      { id: "column_one", label: "Column one", kind: "story", x: 1, y: 10, w: 4, h: 6 },
      { id: "column_two", label: "Column two", kind: "story", x: 5, y: 10, w: 4, h: 6 },
      { id: "column_three", label: "Column three", kind: "story", x: 9, y: 10, w: 4, h: 6 },
      { id: "footer_ad", label: "Footer ad", kind: "ad", x: 1, y: 16, w: 12, h: 3 },
    ],
  },
  {
    id: "photo_first",
    name: "Photo First",
    description: "Large visual lead with compact supporting copy.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "photo_lead", label: "Photo lead", kind: "lead", x: 1, y: 1, w: 12, h: 8 },
      { id: "caption_story", label: "Caption story", kind: "story", x: 1, y: 9, w: 6, h: 4 },
      { id: "reaction", label: "Reaction", kind: "story", x: 7, y: 9, w: 6, h: 4 },
      { id: "gallery_left", label: "Gallery left", kind: "image", x: 1, y: 13, w: 4, h: 4 },
      { id: "gallery_mid", label: "Gallery middle", kind: "image", x: 5, y: 13, w: 4, h: 4 },
      { id: "gallery_right", label: "Gallery right", kind: "image", x: 9, y: 13, w: 4, h: 4 },
      { id: "classified", label: "Classified", kind: "ad", x: 1, y: 17, w: 12, h: 2 },
    ],
  },
  {
    id: "business_compact",
    name: "Business Compact",
    description: "Ticker-like compact blocks with a strong market lead.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "market_lead", label: "Market lead", kind: "lead", x: 1, y: 1, w: 7, h: 6 },
      { id: "market_table", label: "Market table", kind: "sidebar", x: 8, y: 1, w: 5, h: 6 },
      { id: "biz_one", label: "Business one", kind: "story", x: 1, y: 7, w: 4, h: 5 },
      { id: "biz_two", label: "Business two", kind: "story", x: 5, y: 7, w: 4, h: 5 },
      { id: "biz_three", label: "Business three", kind: "story", x: 9, y: 7, w: 4, h: 5 },
      { id: "brand_ad", label: "Brand ad", kind: "ad", x: 1, y: 12, w: 6, h: 4 },
      { id: "brief_stack", label: "Brief stack", kind: "story", x: 7, y: 12, w: 6, h: 4 },
      { id: "footer", label: "Footer", kind: "story", x: 1, y: 16, w: 12, h: 3 },
    ],
  },
  {
    id: "sports_scoreboard",
    name: "Sports Scoreboard",
    description: "Score strip, feature lead, and match reports.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "score_strip", label: "Score strip", kind: "sidebar", x: 1, y: 1, w: 12, h: 2 },
      { id: "match_lead", label: "Match lead", kind: "lead", x: 1, y: 3, w: 8, h: 7 },
      { id: "player_card", label: "Player card", kind: "image", x: 9, y: 3, w: 4, h: 7 },
      { id: "report_a", label: "Report A", kind: "story", x: 1, y: 10, w: 4, h: 5 },
      { id: "report_b", label: "Report B", kind: "story", x: 5, y: 10, w: 4, h: 5 },
      { id: "report_c", label: "Report C", kind: "story", x: 9, y: 10, w: 4, h: 5 },
      { id: "sponsor", label: "Sponsor", kind: "ad", x: 1, y: 15, w: 12, h: 4 },
    ],
  },
  {
    id: "rural_report",
    name: "Rural Report",
    description: "Agriculture-first page with useful sidebars.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "field_lead", label: "Field lead", kind: "lead", x: 1, y: 1, w: 9, h: 6 },
      { id: "weather_box", label: "Weather box", kind: "sidebar", x: 10, y: 1, w: 3, h: 6 },
      { id: "village_one", label: "Village one", kind: "story", x: 1, y: 7, w: 6, h: 5 },
      { id: "village_two", label: "Village two", kind: "story", x: 7, y: 7, w: 6, h: 5 },
      { id: "ad_seed", label: "Seed ad", kind: "ad", x: 1, y: 12, w: 4, h: 4 },
      { id: "advice", label: "Advice column", kind: "story", x: 5, y: 12, w: 4, h: 4 },
      { id: "market_price", label: "Market price", kind: "sidebar", x: 9, y: 12, w: 4, h: 4 },
      { id: "bottom_story", label: "Bottom story", kind: "story", x: 1, y: 16, w: 12, h: 3 },
    ],
  },
  {
    id: "tabloid_energy",
    name: "Tabloid Energy",
    description: "Bold stacked stories for entertainment and city buzz.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "splash", label: "Splash", kind: "lead", x: 1, y: 1, w: 6, h: 8 },
      { id: "buzz", label: "Buzz", kind: "lead", x: 7, y: 1, w: 6, h: 5 },
      { id: "promo", label: "Promo ad", kind: "ad", x: 7, y: 6, w: 6, h: 3 },
      { id: "short_one", label: "Short one", kind: "story", x: 1, y: 9, w: 4, h: 5 },
      { id: "short_two", label: "Short two", kind: "story", x: 5, y: 9, w: 4, h: 5 },
      { id: "short_three", label: "Short three", kind: "story", x: 9, y: 9, w: 4, h: 5 },
      { id: "bottom_visual", label: "Bottom visual", kind: "image", x: 1, y: 14, w: 12, h: 5 },
    ],
  },
  {
    id: "weekend_magazine",
    name: "Weekend Magazine",
    description: "Airier magazine rhythm while staying print-ready.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "cover_story", label: "Cover story", kind: "lead", x: 1, y: 1, w: 5, h: 9 },
      { id: "cover_image", label: "Cover image", kind: "image", x: 6, y: 1, w: 7, h: 9 },
      { id: "essay", label: "Essay", kind: "story", x: 1, y: 10, w: 6, h: 5 },
      { id: "culture", label: "Culture", kind: "story", x: 7, y: 10, w: 6, h: 5 },
      { id: "sponsor_block", label: "Sponsor block", kind: "ad", x: 1, y: 15, w: 4, h: 4 },
      { id: "guide", label: "Guide", kind: "sidebar", x: 5, y: 15, w: 8, h: 4 },
    ],
  },
  {
    id: "classified_plus",
    name: "Classified Plus",
    description: "Stories above, compact ads below, strong section control.",
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    slots: [
      { id: "top_lead", label: "Top lead", kind: "lead", x: 1, y: 1, w: 12, h: 4 },
      { id: "classified_story_a", label: "Story A", kind: "story", x: 1, y: 5, w: 4, h: 5 },
      { id: "classified_story_b", label: "Story B", kind: "story", x: 5, y: 5, w: 4, h: 5 },
      { id: "classified_story_c", label: "Story C", kind: "story", x: 9, y: 5, w: 4, h: 5 },
      { id: "ad_a", label: "Ad A", kind: "ad", x: 1, y: 10, w: 3, h: 3 },
      { id: "ad_b", label: "Ad B", kind: "ad", x: 4, y: 10, w: 3, h: 3 },
      { id: "ad_c", label: "Ad C", kind: "ad", x: 7, y: 10, w: 3, h: 3 },
      { id: "ad_d", label: "Ad D", kind: "ad", x: 10, y: 10, w: 3, h: 3 },
      { id: "bottom_feature", label: "Bottom feature", kind: "story", x: 1, y: 13, w: 12, h: 6 },
    ],
  },
];

function articleText(article?: Article) {
  if (!article) return "";
  return article.corrected_text ?? article.ocr_text ?? article.raw_text ?? article.summary ?? "";
}

function cloneSlots(slots: LayoutSlot[]) {
  return slots.map((slot) => ({ ...slot }));
}

function createInitialState(template: LayoutTemplateDef, articles: Article[]): LayoutState {
  const assignments: Record<string, SlotAssignment> = {};
  const assignedArticleIds = new Set<string>();
  const pageOneArticles = articles
    .filter((article) => !article.page_number || article.page_number === 1)
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

  template.slots.forEach((slot, index) => {
    if (slot.kind === "ad") {
      assignments[slot.id] = { ad: { title: "Advertisement", size: `${slot.w} x ${slot.h}` } };
      return;
    }

    const article = pageOneArticles[index] ?? articles.find((candidate) => !assignedArticleIds.has(candidate.id));
    if (article) {
      assignedArticleIds.add(article.id);
      assignments[slot.id] = { articleId: article.id };
    }
  });

  return {
    templateId: template.id,
    slots: cloneSlots(template.slots),
    assignments,
    rowScale: 100,
    columnScale: 100,
    gutter: 8,
  };
}

function getArticleFit(article: Article | undefined, slot: LayoutSlot): FittingPlan {
  const textLength = articleText(article).length + (article?.headline?.length ?? 0) * 2;
  const area = slot.w * slot.h;
  const density = textLength / Math.max(area, 1);
  const headlineSize = Math.max(13, Math.min(slot.kind === "lead" ? 34 : 22, 34 - density * 0.18));
  const bodySize = Math.max(6.8, Math.min(slot.kind === "lead" ? 11.5 : 9.8, 11.5 - density * 0.055));
  const columns = Math.min(density > 48 ? 4 : 3, Math.max(1, Math.floor(slot.w / 3)));
  const imageHeight = article?.image_url
    ? Math.max(density > 60 ? 0 : 28, Math.min(slot.kind === "lead" ? 170 : 92, slot.h * 22 - density * 0.55))
    : 0;
  const spacing = density > 55 ? 2 : density > 36 ? 4 : 6;

  return { headlineSize, bodySize, imageHeight, columns, spacing };
}

function collides(a: LayoutSlot, b: LayoutSlot) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function canResizeSlot(slots: LayoutSlot[], slotId: string, next: LayoutSlot) {
  if (next.x < 1 || next.y < 1 || next.x + next.w - 1 > GRID_COLUMNS || next.y + next.h - 1 > GRID_ROWS) {
    return false;
  }

  return !slots.some((slot) => slot.id !== slotId && collides(next, slot));
}

function DraggableArticleChip({ article, disabled }: { article: Article; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `article:${article.id}`,
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`w-full rounded-md border bg-background p-2 text-left shadow-sm transition ${isDragging ? "opacity-40" : "hover:border-primary/60"}`}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="line-clamp-2 font-kannada text-xs font-semibold leading-snug">
            {article.headline || "Untitled article"}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>{article.category ?? "Other"}</span>
            <span>P{article.priority_score ?? 0}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function TemplateMiniPreview({ template }: { template: LayoutTemplateDef }) {
  return (
    <div
      className="grid h-16 rounded border bg-newsprint-paper p-1"
      style={{
        gridTemplateColumns: `repeat(${template.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${template.rows}, minmax(0, 1fr))`,
        gap: 1,
      }}
    >
      {template.slots.map((slot) => (
        <div
          key={slot.id}
          className={`rounded-[1px] ${
            slot.kind === "ad"
              ? "bg-amber-200"
              : slot.kind === "lead"
                ? "bg-slate-800"
                : slot.kind === "image"
                  ? "bg-sky-200"
                  : "bg-slate-300"
          }`}
          style={{
            gridColumn: `${slot.x} / span ${slot.w}`,
            gridRow: `${slot.y} / span ${slot.h}`,
          }}
        />
      ))}
    </div>
  );
}

function ArticleSlot({
  slot,
  assignment,
  article,
  selected,
  previewMode,
  canEdit,
  onSelect,
}: {
  slot: LayoutSlot;
  assignment?: SlotAssignment;
  article?: Article;
  selected: boolean;
  previewMode: PreviewMode;
  canEdit: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slot.id}`, disabled: slot.locked || !canEdit });
  const draggable = useDraggable({ id: `slotdrag:${slot.id}`, disabled: slot.locked || !assignment || !canEdit });
  const fit = getArticleFit(article, slot);
  const isAd = Boolean(assignment?.ad) || slot.kind === "ad";
  const showChrome = previewMode !== "pdf";

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-0 overflow-hidden border bg-white transition ${
        selected ? "ring-2 ring-primary" : "border-newsprint-rule"
      } ${isOver ? "bg-emerald-50 ring-2 ring-emerald-500" : ""}`}
      style={{
        gridColumn: `${slot.x} / span ${slot.w}`,
        gridRow: `${slot.y} / span ${slot.h}`,
      }}
      onClick={onSelect}
    >
      {showChrome && (
        <div className="absolute left-1 top-1 z-10 flex items-center gap-1">
          <button
            ref={draggable.setNodeRef}
            type="button"
            className="rounded bg-white/90 p-0.5 text-muted-foreground shadow-sm"
            style={{
              transform: draggable.transform
                ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`
                : undefined,
            }}
            {...draggable.attributes}
            {...draggable.listeners}
          >
            {slot.locked ? <Lock className="h-3 w-3" /> : <GripVertical className="h-3 w-3" />}
          </button>
          <span className="rounded bg-white/90 px-1 text-[8px] font-semibold uppercase tracking-wide shadow-sm">
            {slot.label}
          </span>
        </div>
      )}

      {!assignment && !isAd && (
        <div className="flex h-full items-center justify-center p-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Drop article here
        </div>
      )}

      {isAd && !assignment?.articleId && (
        <div className="flex h-full flex-col items-center justify-center gap-1 bg-amber-50 p-3 text-center text-amber-950">
          <PanelTop className="h-4 w-4" />
          <div className="text-[11px] font-bold uppercase tracking-widest">{assignment?.ad?.title ?? "Advertisement"}</div>
          <div className="text-[9px]">{assignment?.ad?.size ?? `${slot.w} x ${slot.h}`} reserved block</div>
        </div>
      )}

      {assignment?.articleId && article && (
        <div className="flex h-full flex-col p-2 text-newsprint-ink" style={{ gap: fit.spacing }}>
          <div className="text-[8px] font-bold uppercase tracking-widest text-primary">
            {article.category ?? "News"} · auto-fit {fit.columns} col
          </div>
          <h3
            className="font-kannada-serif font-black leading-tight"
            style={{ fontSize: fit.headlineSize, lineHeight: 1.02 }}
          >
            {article.headline || "Untitled article"}
          </h3>
          {article.image_url && fit.imageHeight > 0 && (
            <img src={article.image_url} alt="" className="w-full object-cover" style={{ height: fit.imageHeight }} />
          )}
          <div
            className="min-h-0 flex-1 font-kannada"
            style={{
              columnCount: fit.columns,
              columnGap: 8,
              fontSize: fit.bodySize,
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}
          >
            {articleText(article)}
          </div>
        </div>
      )}
    </div>
  );
}

export function NewspaperLayoutEditor({
  articles,
  pages,
  newspaperId,
  canEdit,
}: {
  articles: Article[];
  pages: number[];
  newspaperId: string;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const articleById = useMemo(() => new Map(articles.map((article) => [article.id, article])), [articles]);
  const [state, setState] = useState<LayoutState>(() => createInitialState(TEMPLATE_DEFS[0], articles));
  const [selectedSlotId, setSelectedSlotId] = useState(state.slots[0]?.id ?? "");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("print");
  const [activeDragLabel, setActiveDragLabel] = useState("");
  const [past, setPast] = useState<LayoutState[]>([]);
  const [future, setFuture] = useState<LayoutState[]>([]);

  const selectedSlot = state.slots.find((slot) => slot.id === selectedSlotId) ?? state.slots[0];
  const selectedAssignment = selectedSlot ? state.assignments[selectedSlot.id] : undefined;
  const selectedArticle = selectedAssignment?.articleId ? articleById.get(selectedAssignment.articleId) : undefined;
  const assignedArticleIds = new Set(
    Object.values(state.assignments)
      .map((assignment) => assignment.articleId)
      .filter(Boolean),
  );
  const unassignedArticles = articles.filter((article) => !assignedArticleIds.has(article.id));

  function commit(updater: (current: LayoutState) => LayoutState) {
    setState((current) => {
      setPast((items) => [...items.slice(-19), current]);
      setFuture([]);
      return updater(current);
    });
  }

  function selectTemplate(templateId: string) {
    const template = TEMPLATE_DEFS.find((item) => item.id === templateId) ?? TEMPLATE_DEFS[0];
    commit(() => createInitialState(template, articles));
    setSelectedSlotId(template.slots[0]?.id ?? "");
  }

  function setAssignment(slotId: string, assignment?: SlotAssignment) {
    commit((current) => ({
      ...current,
      assignments: {
        ...current.assignments,
        [slotId]: assignment ?? {},
      },
    }));
  }

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith("article:")) {
      const article = articleById.get(id.replace("article:", ""));
      setActiveDragLabel(article?.headline ?? "Article");
    } else if (id.startsWith("slotdrag:")) {
      const slot = state.slots.find((item) => item.id === id.replace("slotdrag:", ""));
      setActiveDragLabel(slot?.label ?? "Section");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDragLabel("");
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (!overId.startsWith("slot:")) return;

    const targetSlotId = overId.replace("slot:", "");
    const targetSlot = state.slots.find((slot) => slot.id === targetSlotId);
    if (!targetSlot || targetSlot.locked) return;

    if (activeId.startsWith("article:")) {
      const articleId = activeId.replace("article:", "");
      commit((current) => {
        const nextAssignments = { ...current.assignments };
        Object.keys(nextAssignments).forEach((slotId) => {
          if (nextAssignments[slotId]?.articleId === articleId) nextAssignments[slotId] = {};
        });
        nextAssignments[targetSlotId] = { articleId };
        return { ...current, assignments: nextAssignments };
      });
      setSelectedSlotId(targetSlotId);
      return;
    }

    if (activeId.startsWith("slotdrag:")) {
      const sourceSlotId = activeId.replace("slotdrag:", "");
      if (sourceSlotId === targetSlotId) return;
      commit((current) => ({
        ...current,
        assignments: {
          ...current.assignments,
          [sourceSlotId]: current.assignments[targetSlotId] ?? {},
          [targetSlotId]: current.assignments[sourceSlotId] ?? {},
        },
      }));
      setSelectedSlotId(targetSlotId);
    }
  }

  function resizeSelected(dw: number, dh: number) {
    if (!selectedSlot || selectedSlot.locked) return;
    const next = {
      ...selectedSlot,
      w: Math.max(2, selectedSlot.w + dw),
      h: Math.max(2, selectedSlot.h + dh),
    };
    if (!canResizeSlot(state.slots, selectedSlot.id, next)) {
      toast.error("Resize blocked to prevent overlap or page overflow");
      return;
    }
    commit((current) => ({
      ...current,
      slots: current.slots.map((slot) => (slot.id === selectedSlot.id ? next : slot)),
    }));
  }

  function moveSelected(direction: -1 | 1) {
    if (!selectedSlot) return;
    const index = state.slots.findIndex((slot) => slot.id === selectedSlot.id);
    const target = state.slots[index + direction];
    if (!target || target.locked) return;
    commit((current) => ({
      ...current,
      assignments: {
        ...current.assignments,
        [selectedSlot.id]: current.assignments[target.id] ?? {},
        [target.id]: current.assignments[selectedSlot.id] ?? {},
      },
    }));
    setSelectedSlotId(target.id);
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    setFuture((items) => [state, ...items]);
    setPast((items) => items.slice(0, -1));
    setState(previous);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setPast((items) => [...items, state]);
    setFuture((items) => items.slice(1));
    setState(next);
  }

  function resetLayout() {
    const template = TEMPLATE_DEFS.find((item) => item.id === state.templateId) ?? TEMPLATE_DEFS[0];
    commit(() => createInitialState(template, articles));
    setSelectedSlotId(template.slots[0]?.id ?? "");
  }

  const saveLayout = useMutation({
    mutationFn: async () => {
      const layoutJson = {
        ...state,
        saved_at: new Date().toISOString(),
      };
      const { error: layoutError } = await supabase.from("layouts").insert({
        newspaper_id: newspaperId,
        layout_json: layoutJson,
      });
      if (layoutError) throw layoutError;

      const orderedSlots = state.slots.filter((slot) => state.assignments[slot.id]?.articleId);
      for (const [index, slot] of orderedSlots.entries()) {
        const articleId = state.assignments[slot.id]?.articleId;
        if (!articleId) continue;
        const { error } = await supabase
          .from("articles")
          .update({
            page_number: pages[0] ?? 1,
            position: slot.kind === "lead" ? "top" : "body",
            headline_size: slot.kind === "lead" ? "big" : slot.w >= 6 ? "medium" : "small",
            image_size: slot.kind === "image" || slot.kind === "lead" ? "large" : "small",
            column_count: Math.min(3, Math.max(1, Math.floor(slot.w / 4))),
            priority_score: 100 - index,
          })
          .eq("id", articleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Custom layout saved");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not save layout"),
  });

  const updateArticle = useMutation({
    mutationFn: async (payload: { headline?: string; image_url?: string }) => {
      if (!selectedArticle) return;
      const { error } = await supabase.from("articles").update(payload).eq("id", selectedArticle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Article updated");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update article"),
  });

  const canvasScale = previewMode === "mobile" ? 0.5 : previewMode === "pdf" ? 0.82 : 0.68;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid min-h-[760px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="flex items-center gap-2 font-semibold">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              Templates
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Fixed snap areas only. No free positioning.</p>
          </div>
          <ScrollArea className="h-[686px]">
            <div className="space-y-2 p-3">
              {TEMPLATE_DEFS.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`w-full rounded-md border p-2 text-left transition ${
                    state.templateId === template.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => selectTemplate(template.id)}
                  disabled={!canEdit}
                >
                  <TemplateMiniPreview template={template} />
                  <div className="mt-2 text-sm font-semibold">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <section className="min-w-0 rounded-lg border bg-muted/25">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card p-3">
            <div>
              <div className="text-sm font-semibold">Layout workspace</div>
              <div className="text-xs text-muted-foreground">
                Drag articles into fixed blocks. Drag filled blocks onto another block to swap.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <ToggleGroup
                type="single"
                value={previewMode}
                onValueChange={(value) => value && setPreviewMode(value as PreviewMode)}
              >
                <ToggleGroupItem value="print" aria-label="Print preview">
                  <Monitor className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="pdf" aria-label="PDF preview">
                  <FileDown className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="mobile" aria-label="Mobile preview">
                  <Smartphone className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button size="sm" variant="outline" onClick={undo} disabled={!past.length}>
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={redo} disabled={!future.length}>
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={resetLayout} disabled={!canEdit}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => saveLayout.mutate()} disabled={!canEdit || saveLayout.isPending}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-auto p-4">
            <div
              className={`mx-auto origin-top rounded-md bg-newsprint-paper shadow-xl ${previewMode === "mobile" ? "rounded-[18px] border-[10px] border-slate-900" : ""}`}
              style={{
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
                transform: `scale(${canvasScale})`,
                marginBottom: PAGE_HEIGHT * (canvasScale - 1),
              }}
            >
              <div className="flex h-full flex-col p-6">
                <div className="mb-3 border-b-4 border-double border-newsprint-ink pb-2 text-center">
                  <div className="font-kannada-serif text-5xl font-black leading-none">ಪ್ರಜಾ ವಾಣಿ</div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em]">
                    Print-ready layout editor
                  </div>
                </div>
                <div
                  className="grid min-h-0 flex-1"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, ${state.columnScale / 100}fr))`,
                    gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, ${state.rowScale / 100}fr))`,
                    gap: state.gutter,
                  }}
                >
                  {state.slots.map((slot) => {
                    const assignment = state.assignments[slot.id];
                    const article = assignment?.articleId ? articleById.get(assignment.articleId) : undefined;
                    return (
                      <ArticleSlot
                        key={slot.id}
                        slot={slot}
                        assignment={assignment}
                        article={article}
                        selected={selectedSlot?.id === slot.id}
                        previewMode={previewMode}
                        canEdit={canEdit}
                        onSelect={() => setSelectedSlotId(slot.id)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="min-h-0 rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="text-sm font-semibold">Controls</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="secondary">Snap grid</Badge>
              <Badge variant="secondary">No overlap</Badge>
              <Badge variant="secondary">Auto-fit text</Badge>
            </div>
          </div>

          <ScrollArea className="h-[686px]">
            <div className="space-y-5 p-3">
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Columns3 className="h-3.5 w-3.5" />
                  Page grid
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Column width</Label>
                  <Slider
                    value={[state.columnScale]}
                    min={86}
                    max={114}
                    step={1}
                    onValueChange={([value]) => commit((current) => ({ ...current, columnScale: value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Row height</Label>
                  <Slider
                    value={[state.rowScale]}
                    min={86}
                    max={114}
                    step={1}
                    onValueChange={([value]) => commit((current) => ({ ...current, rowScale: value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Gutter</Label>
                  <Slider
                    value={[state.gutter]}
                    min={2}
                    max={14}
                    step={1}
                    onValueChange={([value]) => commit((current) => ({ ...current, gutter: value }))}
                    disabled={!canEdit}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Rows3 className="h-3.5 w-3.5" />
                  Section
                </div>
                {selectedSlot && (
                  <>
                    <div className="rounded-md border bg-background p-2">
                      <div className="text-sm font-semibold">{selectedSlot.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {selectedSlot.kind} · {selectedSlot.w} columns x {selectedSlot.h} rows
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" onClick={() => resizeSelected(1, 0)} disabled={!canEdit}>
                        <Maximize2 className="mr-1 h-3.5 w-3.5" />
                        Wider
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resizeSelected(-1, 0)} disabled={!canEdit}>
                        <Minimize2 className="mr-1 h-3.5 w-3.5" />
                        Narrower
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resizeSelected(0, 1)} disabled={!canEdit}>
                        Taller
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resizeSelected(0, -1)} disabled={!canEdit}>
                        Shorter
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" onClick={() => moveSelected(-1)} disabled={!canEdit}>
                        <ArrowDownUp className="mr-1 h-3.5 w-3.5" />
                        Previous
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => moveSelected(1)} disabled={!canEdit}>
                        <ArrowDownUp className="mr-1 h-3.5 w-3.5" />
                        Next
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        commit((current) => ({
                          ...current,
                          slots: current.slots.map((slot) =>
                            slot.id === selectedSlot.id ? { ...slot, locked: !slot.locked } : slot,
                          ),
                        }))
                      }
                      disabled={!canEdit}
                    >
                      {selectedSlot.locked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                      {selectedSlot.locked ? "Unlock section" : "Lock section"}
                    </Button>
                  </>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <PanelTop className="h-3.5 w-3.5" />
                  Blocks
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      selectedSlot &&
                      setAssignment(selectedSlot.id, { ad: { title: "Advertisement", size: `${selectedSlot.w} x ${selectedSlot.h}` } })
                    }
                    disabled={!canEdit || !selectedSlot}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ad
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => selectedSlot && setAssignment(selectedSlot.id)}
                    disabled={!canEdit || !selectedSlot}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <Type className="h-3.5 w-3.5" />
                  Article edit
                </div>
                {selectedArticle ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Headline</Label>
                      <Input
                        key={`headline-${selectedArticle.id}`}
                        defaultValue={selectedArticle.headline ?? ""}
                        onBlur={(event) => updateArticle.mutate({ headline: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          key={`image-${selectedArticle.id}`}
                          defaultValue={selectedArticle.image_url ?? ""}
                          onBlur={(event) => updateArticle.mutate({ image_url: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          disabled={!canEdit}
                        />
                        <Button size="icon" variant="outline" disabled>
                          <Image className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
                      Auto-fit adjusts headline size, body size, image height, spacing, and columns from the block area
                      and article length.
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Select an article block to edit headline and image.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <GripVertical className="h-3.5 w-3.5" />
                  Article tray
                </div>
                <Select
                  value={selectedSlot?.id}
                  onValueChange={(value) => setSelectedSlotId(value)}
                  disabled={!selectedSlot}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.slots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  {unassignedArticles.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                      All articles are placed.
                    </div>
                  ) : (
                    unassignedArticles.map((article) => (
                      <DraggableArticleChip key={article.id} article={article} disabled={!canEdit} />
                    ))
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>
        </aside>
      </div>

      <DragOverlay>
        {activeDragLabel ? (
          <div className="max-w-64 rounded-md border bg-background px-3 py-2 text-sm font-semibold shadow-lg">
            {activeDragLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
