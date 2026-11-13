"use client";
import useSWR from "swr";
import { Check, Circle } from "lucide-react";
import { fetcher } from "@/lib/format";

interface Status {
  plaid: boolean;
  plaidEnv: string;
  finnhub: boolean;
  anthropic: boolean;
  connections: { itemId: string; institution: string }[];
}

export function SetupBanner() {
  const { data } = useSWR<Status>("/api/status", fetcher);
  if (!data) return null;
  const steps = [
    { done: data.plaid, label: "Plaid keys", hint: "PLAID_CLIENT_ID / PLAID_SECRET" },
    { done: data.connections.length > 0, label: "Link an account", hint: "+ Bank / + Brokerage above" },
    { done: data.finnhub, label: "Live quotes & news", hint: "FINNHUB_API_KEY" },
    { done: data.anthropic, label: "Jarvis AI", hint: "ANTHROPIC_API_KEY" },
  ];
  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-sm">
      <span className="text-ink-2">
        You're looking at <span className="text-warn">sample data</span>. To use your own accounts:
      </span>
      {steps.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5" title={s.hint}>
          {s.done ? <Check size={14} className="text-up" /> : <Circle size={12} className="text-ink-3" />}
          <span className={s.done ? "text-ink-2 line-through decoration-ink-3" : "text-ink"}>{s.label}</span>
          {!s.done && <span className="hidden font-mono text-[10px] text-ink-3 lg:inline">{s.hint}</span>}
        </span>
      ))}
    </div>
  );
}
