
# Prajavani AI Studio — Build Plan

A newsroom CMS with two roles (Editor, Chief Editor) and an AI pipeline (OCR → correction → headline/summary/category/priority → image → layout → publish). Real LLM + image generation via Lovable AI. OCR and Kannada TTS are structured as pluggable edge functions with clearly-labeled mock responses so the full flow is demonstrable.

## Scope confirmation before I start

This is a large, multi-week build. I'll ship it as one coherent MVP in this project — every screen and flow wired end-to-end, real AI where feasible, labeled stubs where not. Please confirm:

1. **Auth**: Email/password only, role picked at signup via dropdown (as you wrote). No Google/Apple. OK?
2. **OCR**: Mocked Kannada text response now, edge function shaped for a real provider later. OK?
3. **TTS (Kannada audio newspaper)**: Same — mocked audio (silent/placeholder mp3 + on-screen "Simulated" label), real provider pluggable later. OK?
4. **PDF/E-paper**: Client-side generated (html2canvas + jsPDF) from the layout preview, stored in Supabase Storage. OK?
5. **Social kit images**: Rendered client-side from templated HTML → PNG, stored in Storage. OK?

If you say "go", I proceed with the above defaults.

## Stack

- TanStack Start + Tailwind + shadcn (existing template)
- Lovable Cloud (Supabase) — auth, Postgres, Storage, Edge Functions
- Lovable AI Gateway — `google/gemini-3-flash-preview` for text, `google/gemini-3.1-flash-image` for image gen
- Noto Sans Kannada + serif (Playfair/Merriweather) for newspaper preview typography

## Data model

Tables exactly as you specified: `profiles(role)`, `user_roles`, `newspapers`, `articles`, `layouts`, `reviews`, `publications`. `has_role()` security-definer + RLS on all. Storage buckets: `raw-uploads` (private), `generated-assets` (public).

## Edge functions

- `process-ocr` — mock Kannada text; provider-swap ready
- `process-article-ai` — real Gemini call, returns `{corrected_text, headline, summary, category, priority_score}` as strict JSON
- `generate-image` — real Gemini image gen from headline+summary
- `generate-layout` — deterministic TS algorithm (priority-sorted bin-packing across pages, assigns page/position/sizes/columns)
- `publish-newspaper` — orchestrates lock → PDF → e-paper → TTS(mock) → social kit → publications insert
- `tts-kannada` — mocked audio URL, provider-swap ready

## Screens

**Shared**
- Sidebar shell (Dashboard, Editions, Review Queue [chief only], Pipeline, About Workflow, Settings)
- Auth pages (sign in / sign up with role dropdown)
- Status badge system, workflow tracker component, newspaper page preview component (the visual hero — multi-column grid, serif headlines, image blocks)

**Editor**
1. Dashboard — editions list with status badges + Create button
2. Create Edition modal
3. Article Workspace (per edition) — Add Article with 4 input tabs (Text/Image/PDF/Scan)
4. Article detail — step tracker (Upload → OCR → AI → Headline → Category → Priority → Image → Ready), inline edit, image decision panel (existing vs AI-generate)
5. Layout view — auto-generated page previews + drag-and-drop layout editor (dnd-kit), inline text/headline edit, resize handles, override controls, insert Ad block
6. Final preview with Print/PDF/Mobile toggle + "Send to Chief Editor"

**Chief Editor**
7. Review Queue — pending editions with summary stats
8. Review screen — full read-only preview + side panel + Approve/Reject(with comment)/Comment actions
9. On approve → publish pipeline progress UI

**Published**
10. Final Outputs page — Print PDF, E-Paper viewer, Audio player, Social Media Kit (IG card, FB post, WhatsApp preview) with download/share

**Meta**
11. About Workflow — interaction loop diagram (Editor → AI → Editor → Chief → Publish) + explainer
12. Pipeline status page — all 10 AI modules with which step they handle

## Seed data

Migration inserts one demo edition "Prajavani — 03 July 2026, 12 pages" with 6 sample Kannada articles across Politics/Sports/Crime/Agriculture/Education/Cinema at varied priorities, already run through pipeline (corrected_text, headlines, summaries, categories, priority_scores, layout_json all pre-populated) so the app is explorable on first load. Seed accounts documented in About page (editor@demo / chief@demo).

## Design

- App chrome: modern sans (Inter), dense CMS feel, deep-red accent (#B91C1C-ish in oklch), neutral surfaces
- Newspaper preview: cream/newsprint bg, serif headlines with real hierarchy (72/48/32/24pt), Noto Sans Kannada for body, real column rules
- Status badge palette per spec
- Fully responsive; sidebar collapses on mobile

## Build order (I'll ship in this order in one go)

1. Enable Lovable Cloud, provision LOVABLE_API_KEY, migrations + RLS + seed
2. Auth + role gating + sidebar shell + design system (fonts, tokens, badges)
3. Editor dashboard + Create Edition + Article Workspace with 4 input tabs
4. Edge functions: process-ocr (mock), process-article-ai (real), generate-image (real)
5. Article detail with workflow tracker + image decision
6. Layout engine + newspaper page preview component + layout editor (dnd)
7. Send-to-chief flow + Chief Review Queue + Review screen + Approve/Reject
8. Publish pipeline (PDF/e-paper/TTS-mock/social kit) + Final Outputs page
9. About Workflow + Pipeline modules pages
10. Seed data migration + polish pass

## Realism caveats I'll surface in the UI

- Kannada OCR: labeled "Simulated OCR" chip on outputs; edge function ready for Google Vision drop-in
- Kannada TTS: labeled "Simulated Audio" chip on the audio player; edge function ready for real TTS drop-in
- Everything else (correction, headline, summary, category, priority, image, layout, PDF, social cards) is real

Reply "go" (or with any changes to the 5 confirmations above) and I'll start building.
