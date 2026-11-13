"use client";
import { useEffect, useRef } from "react";
import type { Portfolio } from "@/lib/types";
import { pct, signedUsd, usd } from "@/lib/format";

export function Holdings({ p }: { p: Portfolio }) {
  const prev = useRef<Record<string, number>>({});
  const rows = p.holdings.filter((h) => h.type !== "cash");
  const flashes: Record<string, string> = {};
  for (const h of rows) {
    const key = `${h.accountId}:${h.symbol}`;
    const before = prev.current[key];
    if (before != null && before !== h.price) flashes[key] = h.price > before ? "flash-up" : "flash-down";
  }
  useEffect(() => {
    rows.forEach((h) => (prev.current[`${h.accountId}:${h.symbol}`] = h.price));
  });
  const acctName = (id: string) => {
    const a = p.accounts.find((x) => x.id === id);
    return a ? `${a.institution} · ${a.name}` : "";
  };

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <div className="label">Holdings</div>
        <div className="text-xs text-ink-3">{rows.length} positions</div>
      </div>
      <div className="scroll-thin mt-3 max-h-[440px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-panel text-left">
            <tr className="label !text-[10px]">
              <th className="py-2 font-normal">Symbol</th>
              <th className="py-2 text-right font-normal">Price</th>
              <th className="py-2 text-right font-normal">Today</th>
              <th className="hidden py-2 text-right font-normal sm:table-cell">Value</th>
              <th className="hidden py-2 text-right font-normal md:table-cell">Weight</th>
              <th className="hidden py-2 text-right font-normal lg:table-cell">Total gain</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const key = `${h.accountId}:${h.symbol}`;
              const gain = h.costBasis != null ? h.value - h.costBasis : null;
              const weight = p.invested ? (h.value / p.invested) * 100 : 0;
              const up = (h.dayChange ?? 0) >= 0;
              return (
                <tr key={key} className={`border-t border-line/60 ${flashes[key] ?? ""}`}>
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-ink">{h.symbol}</span>
                      {h.live && <span className="h-1.5 w-1.5 rounded-full bg-accent" title="Live quote" />}
                    </div>
                    <div className="max-w-[180px] truncate text-[11px] text-ink-3" title={`${h.name} · ${acctName(h.accountId)}`}>
                      {h.name} · {h.institution}
                    </div>
                  </td>
                  <td className="tabular py-2.5 text-right text-ink">{usd(h.price, 2)}</td>
                  <td className={`tabular py-2.5 text-right ${h.dayChange == null ? "text-ink-3" : up ? "text-up" : "text-down"}`}>
                    {h.dayChange == null ? (
                      "—"
                    ) : (
                      <>
                        <div>{pct(h.dayChangePct ?? 0)}</div>
                        <div className="text-[11px] opacity-80">{signedUsd(h.dayChange)}</div>
                      </>
                    )}
                  </td>
                  <td className="tabular hidden py-2.5 text-right text-ink sm:table-cell">{usd(h.value)}</td>
                  <td className="hidden py-2.5 text-right md:table-cell">
                    <div className="tabular text-ink-2">{weight.toFixed(1)}%</div>
                    <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded bg-line">
                      <div className="h-full rounded bg-s1" style={{ width: `${Math.min(100, weight * 3)}%` }} />
                    </div>
                  </td>
                  <td
                    className={`tabular hidden py-2.5 text-right lg:table-cell ${gain == null ? "text-ink-3" : gain >= 0 ? "text-up" : "text-down"}`}
                  >
                    {gain == null ? "—" : signedUsd(gain)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
