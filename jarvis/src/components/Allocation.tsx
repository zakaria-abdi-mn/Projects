"use client";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { Portfolio } from "@/lib/types";
import { usd } from "@/lib/format";

// Fixed entity→color mapping (color follows the class, never its rank).
const CLASSES = [
  { k: "Cash", color: "var(--color-s1)" },
  { k: "Stocks", color: "var(--color-s2)" },
  { k: "ETFs", color: "var(--color-s3)" },
  { k: "Funds", color: "var(--color-s4)" },
  { k: "Other", color: "var(--color-s5)" },
] as const;

function classify(type: string): (typeof CLASSES)[number]["k"] {
  if (type === "cash") return "Cash";
  if (type === "equity") return "Stocks";
  if (type === "etf") return "ETFs";
  if (type.includes("fund")) return "Funds";
  return "Other";
}

/** Where your assets live: one-hue magnitude bars per institution. */
function ByInstitution({ p }: { p: Portfolio }) {
  const totals = new Map<string, number>();
  p.accounts
    .filter((a) => a.balance > 0)
    .forEach((a) => totals.set(a.institution, (totals.get(a.institution) ?? 0) + a.balance));
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="label mb-2 !text-[10px]">Assets by institution</div>
      <ul className="space-y-2">
        {rows.map(([inst, v]) => (
          <li key={inst} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm" title={`${inst}: ${usd(v)}`}>
            <span className="truncate text-ink-2">{inst}</span>
            <span className="h-2 rounded-r bg-line/50">
              <span className="block h-full rounded-r bg-s1" style={{ width: `${(v / max) * 100}%` }} />
            </span>
            <span className="tabular text-ink">{usd(v)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Allocation({ p }: { p: Portfolio }) {
  const [hover, setHover] = useState<string | null>(null);
  const totals = new Map<string, number>([["Cash", p.cash]]);
  for (const h of p.holdings) {
    const c = classify(h.type);
    totals.set(c, (totals.get(c) ?? 0) + h.value);
  }
  const total = [...totals.values()].reduce((s, v) => s + v, 0);
  const data = CLASSES.map((c) => ({ name: c.k, color: c.color, value: totals.get(c.k) ?? 0 })).filter((d) => d.value > 0);
  const focus = data.find((d) => d.name === hover);

  return (
    <section className="panel flex-1 p-5">
      <div className="label">Allocation</div>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={2}
                stroke="#0b121b"
                strokeWidth={2}
                isAnimationActive={false}
                onMouseLeave={() => setHover(null)}
              >
                {data.map((d) => (
                  <Cell
                    key={d.name}
                    fill={d.color}
                    opacity={hover && hover !== d.name ? 0.35 : 1}
                    onMouseEnter={() => setHover(d.name)}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="label !text-[9px]">{focus?.name ?? "Total"}</div>
            <div className="tabular text-sm font-medium">{usd(focus?.value ?? total)}</div>
            {focus && <div className="text-[11px] text-ink-3">{((focus.value / total) * 100).toFixed(1)}%</div>}
          </div>
        </div>
        <ul className="flex-1 space-y-1.5 text-sm">
          {data.map((d) => (
            <li
              key={d.name}
              className="flex items-center justify-between gap-2 rounded px-1"
              onMouseEnter={() => setHover(d.name)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="inline-flex items-center gap-2 text-ink-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                {d.name}
              </span>
              <span className="tabular text-ink">{((d.value / total) * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <ByInstitution p={p} />
    </section>
  );
}
