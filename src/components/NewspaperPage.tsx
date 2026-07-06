import type { Article, Newspaper } from "@/lib/api";

interface Props {
  newspaper: Newspaper;
  articles: Article[];
  pageNumber: number;
}

/** Renders one newspaper page in real column layout with headline hierarchy. */
export function NewspaperPage({ newspaper, articles, pageNumber }: Props) {
  const pageArticles = articles
    .filter((a) => (a.page_number ?? 0) === pageNumber)
    .sort((a, b) => (a.position === "top" ? -1 : b.position === "top" ? 1 : 0));

  const lead = pageArticles.find((a) => a.headline_size === "big") ?? pageArticles[0];
  const rest = pageArticles.filter((a) => a.id !== lead?.id);

  return (
    <div className="newsprint mx-auto shadow-xl" style={{ width: "100%", maxWidth: 780, aspectRatio: "0.72", padding: "28px 32px" }}>
      {/* Masthead only on page 1 */}
      {pageNumber === 1 && (
        <div className="mb-3 border-b-4 border-double border-newsprint-ink pb-3 text-center">
          <div className="font-serif text-5xl font-black tracking-tight">{newspaper.edition_name}</div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest">
            <span>{newspaper.language}</span>
            <span>{new Date(newspaper.edition_date).toDateString()}</span>
            <span>Page {pageNumber} of {newspaper.number_of_pages}</span>
          </div>
        </div>
      )}
      {pageNumber !== 1 && (
        <div className="mb-3 flex items-center justify-between border-b border-newsprint-rule pb-2 text-[10px] uppercase tracking-widest">
          <span>{newspaper.edition_name}</span>
          <span>Page {pageNumber}</span>
        </div>
      )}

      {!lead && (
        <div className="flex h-full items-center justify-center text-sm italic opacity-60">
          — Advertisement space —
        </div>
      )}

      {lead && (
        <div className="mb-4 border-b border-newsprint-rule pb-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{lead.category}</div>
          <h1 className="mt-1 font-kannada-serif text-4xl font-black leading-tight">{lead.headline}</h1>
          {lead.summary && <p className="mt-2 font-kannada text-sm italic opacity-80">{lead.summary}</p>}
          <div className="mt-3 grid grid-cols-3 gap-3">
            {lead.image_url && (
              <div className="col-span-3">
                <img src={lead.image_url} alt="" className="w-full object-cover" style={{ maxHeight: 240 }} />
                <div className="text-[9px] italic opacity-70">— Photo caption —</div>
              </div>
            )}
            <div className="col-span-3 font-kannada text-[13px] leading-relaxed" style={{ columnCount: 3, columnGap: 12 }}>
              {lead.corrected_text ?? lead.ocr_text ?? lead.raw_text}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {rest.map((a) => (
          <div key={a.id} className="border-t border-newsprint-rule pt-2">
            <div className="text-[9px] font-bold uppercase tracking-widest text-primary">{a.category}</div>
            <h3 className={`font-kannada-serif font-bold leading-tight ${a.headline_size === "medium" ? "text-lg" : "text-base"}`}>{a.headline}</h3>
            {a.image_url && <img src={a.image_url} alt="" className="mt-1.5 w-full object-cover" style={{ maxHeight: 110 }} />}
            <p className="mt-1 font-kannada text-[12px] leading-snug" style={{ columnCount: a.column_count && a.column_count > 1 ? 2 : 1, columnGap: 8 }}>
              {a.corrected_text ?? a.summary ?? a.ocr_text ?? a.raw_text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between border-t border-newsprint-rule pt-1 text-[9px] uppercase tracking-widest">
        <span>{newspaper.edition_name}</span>
        <span>{new Date(newspaper.edition_date).toLocaleDateString()}</span>
        <span>Page {pageNumber}</span>
      </div>
    </div>
  );
}
