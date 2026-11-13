"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ConnectButtons } from "./PlaidConnect";

export function Header({
  live,
  updatedAt,
  thinking,
  onRefresh,
}: {
  live: boolean;
  updatedAt?: string;
  thinking: boolean;
  onRefresh: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hour = now?.getHours() ?? 12;
  const greet = hour < 5 ? "Burning the midnight oil" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className={`flex items-center gap-4 ${thinking ? "thinking" : ""}`}>
        <div className="reactor shrink-0" aria-hidden />
        <div>
          <div className="font-mono text-lg font-semibold tracking-[0.35em] text-accent">J.A.R.V.I.S.</div>
          <div className="text-sm text-ink-2">{greet}. Here's where your money stands.</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="font-mono text-sm tabular text-ink">
            {now?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) ?? "--:--:--"}
          </div>
          <div className="label !text-[10px]">
            {now?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) ?? ""}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] tracking-widest ${
            live ? "border-up/40 text-up" : "border-warn/40 text-warn"
          }`}
          title={updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : undefined}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-up" : "bg-warn"} animate-pulse`} />
          {live ? "LIVE" : "DEMO DATA"}
        </span>
        <button
          onClick={onRefresh}
          className="rounded-lg border border-line p-2 text-ink-2 transition hover:border-accent/50 hover:text-accent"
          aria-label="Refresh now"
        >
          <RefreshCw size={16} />
        </button>
        <ConnectButtons />
      </div>
    </header>
  );
}
