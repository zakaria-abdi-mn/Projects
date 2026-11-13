"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Portfolio } from "@/lib/types";
import { pct, signedUsd, usd } from "@/lib/format";

/** Smoothly tweens a number toward its target whenever it changes. */
function useTween(target: number, ms = 900) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(a + (target - a) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function Delta({ value, percent, size = "sm" }: { value: number; percent?: number; size?: "sm" | "lg" }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 tabular font-medium ${up ? "text-up" : "text-down"} ${size === "lg" ? "text-lg" : "text-sm"}`}>
      <Icon size={size === "lg" ? 20 : 14} aria-hidden />
      {signedUsd(value)}
      {percent != null && <span className="opacity-80">({pct(percent)})</span>}
    </span>
  );
}

export function NetWorthHero({ p }: { p: Portfolio }) {
  const nw = useTween(p.netWorth);
  const tiles = [
    { k: "Cash", v: p.cash },
    { k: "Investments", v: p.invested },
    { k: "Debt", v: -p.liabilities },
    { k: "Unrealized gain", v: p.totalGain },
  ];
  return (
    <section className="panel p-6">
      <div className="label">Net worth</div>
      <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
        <div className="tabular text-5xl font-semibold tracking-tight text-ink sm:text-6xl">{usd(nw)}</div>
        <div className="pb-2">
          <Delta value={p.dayChange} percent={p.dayChangePct} size="lg" />
          <div className="label mt-1 !text-[10px]">today, investments</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-xl border border-line bg-bg/40 px-4 py-3">
            <div className="label !text-[10px]">{t.k}</div>
            <div className="mt-1 tabular text-xl font-medium text-ink">
              {t.v == null ? "—" : t.k === "Unrealized gain" ? signedUsd(t.v) : usd(t.v)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
