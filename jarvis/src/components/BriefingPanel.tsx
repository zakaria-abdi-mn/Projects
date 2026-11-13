"use client";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import type { Briefing } from "@/lib/types";
import { signedUsd, timeAgo } from "@/lib/format";

const MOOD = {
  bullish: { label: "Risk-on", cls: "text-up border-up/40" },
  bearish: { label: "Risk-off", cls: "text-down border-down/40" },
  neutral: { label: "Steady", cls: "text-ink-2 border-line" },
};

export function BriefingPanel({
  b,
  loading,
  error,
  onRefresh,
}: {
  b?: Briefing;
  loading: boolean;
  error?: string;
  onRefresh: () => void;
}) {
  return (
    <section className="panel overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" aria-hidden />
          <span className="label !text-accent">Daily briefing</span>
          {b && (
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-widest ${MOOD[b.mood].cls}`}>
              {MOOD[b.mood].label}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-3 transition hover:text-accent disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Analyzing…" : b ? `Updated ${timeAgo(new Date(b.generatedAt).getTime())}` : "Generate"}
        </button>
      </div>

      {error && !b && <p className="mt-4 text-sm text-down">Briefing failed: {error}</p>}
      {!b && !error && (
        <div className="mt-4 space-y-3">
          <div className="skeleton h-7 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <p className="pt-1 text-xs text-ink-3">Jarvis is reading the news and your positions…</p>
        </div>
      )}

      {b && (
        <>
          <h2 className="mt-3 text-2xl font-semibold leading-snug text-ink">{b.headline}</h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-ink-2">{b.summary}</p>

          {b.whyMoved.length > 0 && (
            <div className="mt-5">
              <div className="label mb-2 !text-[10px]">Why you moved today</div>
              <div className="grid gap-2 md:grid-cols-2">
                {b.whyMoved.map((m) => {
                  const up = m.impact >= 0;
                  const Icon = up ? ArrowUpRight : ArrowDownRight;
                  return (
                    <div key={m.symbol} className="rounded-xl border border-line bg-bg/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-ink">{m.symbol}</span>
                        <span className={`inline-flex items-center gap-1 tabular text-sm ${up ? "text-up" : "text-down"}`}>
                          <Icon size={14} aria-hidden />
                          {signedUsd(m.impact)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-ink-2">{m.explanation}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {b.risks.length > 0 && (
            <div className="mt-5">
              <div className="label mb-2 !text-[10px]">On the radar</div>
              <ul className="space-y-1.5">
                {b.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {b.sources && b.sources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {b.sources.slice(0, 5).map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-3 hover:border-accent/40 hover:text-accent"
                >
                  <ExternalLink size={10} className="shrink-0" />
                  <span className="truncate">{s.title}</span>
                </a>
              ))}
            </div>
          )}
          {b.source === "demo" && (
            <p className="mt-4 text-[11px] text-ink-3">
              Sample briefing. Add ANTHROPIC_API_KEY to get a live analysis of your accounts that uses web search.
            </p>
          )}
        </>
      )}
    </section>
  );
}
