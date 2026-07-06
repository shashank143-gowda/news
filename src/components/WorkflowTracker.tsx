import { Check, Circle } from "lucide-react";

const STEPS = [
  { key: "uploaded", label: "Uploaded" },
  { key: "ocr", label: "OCR" },
  { key: "ai_processing", label: "AI Processing" },
  { key: "headline", label: "Headline" },
  { key: "category", label: "Category" },
  { key: "priority", label: "Priority" },
  { key: "image", label: "Image" },
  { key: "ready_for_layout", label: "Ready" },
];

export function WorkflowTracker({ status }: { status: Record<string, boolean> | null | undefined }) {
  const s = status ?? {};
  return (
    <div className="flex flex-wrap gap-1.5">
      {STEPS.map((step) => {
        const done = !!s[step.key];
        return (
          <span key={step.key} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${done ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800" : "border-border bg-muted text-muted-foreground"}`}>
            {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            {step.label}
          </span>
        );
      })}
    </div>
  );
}
