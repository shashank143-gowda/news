import { createFileRoute, Link } from "@tanstack/react-router";
import { Newspaper, Sparkles, Users, Layout, FileCheck2, Radio } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold">Prajavani AI Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Get started</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> AI-powered Kannada newsroom
          </div>
          <h1 className="mt-6 font-serif text-6xl font-bold leading-[1.05] tracking-tight">
            Ship tomorrow's <span className="text-primary">Kannada newspaper</span> before deadline.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            OCR, grammar correction, headline generation, categorisation, priority scoring, image generation and full-page layout — automated. Editors and chief editors stay in creative control.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">Open the newsroom</Link>
            <Link to="/auth" className="rounded-md border border-input px-6 py-3 text-sm font-semibold hover:bg-accent">Sign in</Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: "AI pipeline", body: "OCR → correction → headline → summary → category → priority → image → layout." },
            { icon: Layout, title: "Real page layout", body: "Priority-driven multi-column newsprint layout you can drag, resize, and override." },
            { icon: FileCheck2, title: "Chief Editor approval", body: "Structured review queue with approve, reject, and comment before press." },
            { icon: Users, title: "Two roles", body: "Editor builds and lays out. Chief Editor reviews and publishes." },
            { icon: Radio, title: "Multi-format publish", body: "Print PDF, e-paper, Kannada audio, Instagram, Facebook, WhatsApp — one click." },
            { icon: Newspaper, title: "Kannada-native", body: "Noto Sans Kannada throughout. Layout tuned for real newsprint typography." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border bg-card p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
