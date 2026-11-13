"use client";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistoryPoint } from "@/lib/types";
import { compactUsd, usd } from "@/lib/format";
import { Delta } from "./NetWorthHero";

const RANGES = [
  { k: "1W", days: 7 },
  { k: "1M", days: 30 },
  { k: "3M", days: 90 },
  { k: "YTD", days: -1 },
  { k: "1Y", days: 365 },
  { k: "ALL", days: Infinity },
] as const;

const SERIES = [
  { key: "netWorth", name: "Net worth", color: "var(--color-s1)" },
  { key: "invested", name: "Investments", color: "var(--color-s3)" },
] as const;

export function PerformanceChart({ history, demo }: { history: HistoryPoint[]; demo: boolean }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["k"]>("3M");
  const data = useMemo(() => {
    const r = RANGES.find((x) => x.k === range)!;
    const cutoff =
      r.days === -1 ? new Date(new Date().getFullYear(), 0, 1).getTime() : Date.now() - r.days * 86400000;
    return history.filter((p) => p.t >= cutoff);
  }, [history, range]);

  const first = data[0];
  const last = data[data.length - 1];
  const change = first && last ? last.netWorth - first.netWorth : 0;
  const changePct = first && first.netWorth ? (change / first.netWorth) * 100 : 0;
  const spanDays = first && last ? (last.t - first.t) / 86400000 : 0;
  const fmtTick = (t: number) =>
    new Date(t).toLocaleDateString("en-US", spanDays > 200 ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" });

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label">Performance</div>
          <div className="mt-1 flex items-center gap-3">
            {data.length > 1 ? <Delta value={change} percent={changePct} /> : <span className="text-sm text-ink-3">Collecting data…</span>}
            <span className="text-xs text-ink-3">over {range === "ALL" ? "all time" : range}</span>
          </div>
        </div>
        <div className="flex rounded-lg border border-line p-0.5" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.k}
              role="tab"
              aria-selected={range === r.k}
              onClick={() => setRange(r.k)}
              className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition ${
                range === r.k ? "bg-accent/15 text-accent" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {r.k}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-ink-2">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      <div className="mt-2 h-72">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="#1b2a3a" strokeDasharray="2 6" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={fmtTick}
                stroke="#5f7487"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={compactUsd}
                stroke="#5f7487"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
                domain={["auto", "auto"]}
              />
              <Tooltip
                cursor={{ stroke: "#4fd1ff", strokeOpacity: 0.4, strokeDasharray: "3 3" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-line bg-panel/95 px-3 py-2 text-xs shadow-xl">
                      <div className="mb-1 text-ink-3">
                        {new Date(Number(label)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      {payload.map((pl) => (
                        <div key={String(pl.dataKey)} className="flex items-center justify-between gap-6">
                          <span className="inline-flex items-center gap-1.5 text-ink-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: String(pl.color) }} />
                            {pl.name}
                          </span>
                          <span className="tabular text-ink">{usd(Number(pl.value))}</span>
                        </div>
                      ))}
                    </div>
                  ) : null
                }
              />
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#g-${s.key})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#0b121b" }}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-ink-3">
            {demo ? "No data" : "Jarvis records a snapshot every 15 minutes while the dashboard is open. Your chart fills in from here."}
          </div>
        )}
      </div>
    </section>
  );
}
