"use client";
import { Newspaper } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { timeAgo } from "@/lib/format";

export function NewsFeed({ items, held, demo }: { items?: NewsItem[]; held: Set<string>; demo?: boolean }) {
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <div className="label">Market wire</div>
        {demo && <span className="text-[10px] text-ink-3">sample: add FINNHUB_API_KEY</span>}
      </div>
      <ul className="scroll-thin mt-3 max-h-[520px] space-y-1 overflow-auto pr-1">
        {!items && Array.from({ length: 5 }).map((_, i) => <li key={i} className="skeleton h-14" />)}
        {items?.map((n) => {
          const mine = n.related?.filter((s) => held.has(s)) ?? [];
          return (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="group block rounded-lg px-2 py-2.5 transition hover:bg-bg/50"
              >
                <div className="flex items-center gap-2 text-[11px] text-ink-3">
                  <Newspaper size={11} aria-hidden />
                  <span>{n.source}</span>
                  <span>·</span>
                  <span>{timeAgo(n.datetime)}</span>
                  {mine.map((s) => (
                    <span key={s} className="rounded bg-accent/10 px-1.5 font-mono text-[10px] text-accent">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-1 text-sm font-medium leading-snug text-ink group-hover:text-accent">{n.headline}</div>
                {n.summary && <p className="mt-0.5 line-clamp-2 text-xs text-ink-3">{n.summary}</p>}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
