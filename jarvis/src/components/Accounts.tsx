"use client";
import { Building2, CreditCard, Landmark, LineChart, Wallet } from "lucide-react";
import type { Account, AccountKind } from "@/lib/types";
import { usd } from "@/lib/format";

const ICON: Record<AccountKind, typeof Wallet> = {
  depository: Landmark,
  credit: CreditCard,
  investment: LineChart,
  loan: Building2,
  other: Wallet,
};

export function Accounts({ accounts }: { accounts: Account[] }) {
  const groups = new Map<string, Account[]>();
  accounts.forEach((a) => groups.set(a.institution, [...(groups.get(a.institution) ?? []), a]));
  const sorted = [...groups.entries()].sort(
    (a, b) => b[1].reduce((s, x) => s + x.balance, 0) - a[1].reduce((s, x) => s + x.balance, 0),
  );
  return (
    <section className="panel p-5">
      <div className="label">Accounts</div>
      <div className="mt-3 space-y-4">
        {sorted.map(([inst, list]) => (
          <div key={inst}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{inst}</span>
              <span className="tabular text-sm text-ink-2">{usd(list.reduce((s, a) => s + a.balance, 0))}</span>
            </div>
            <ul className="space-y-1">
              {list.map((a) => {
                const Icon = ICON[a.kind];
                return (
                  <li key={a.id} className="flex items-center justify-between rounded-lg bg-bg/40 px-3 py-2 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2 text-ink-2">
                      <Icon size={14} className="shrink-0 text-ink-3" aria-hidden />
                      <span className="truncate">{a.name}</span>
                      {a.mask && <span className="font-mono text-[11px] text-ink-3">••{a.mask}</span>}
                    </span>
                    <span className={`tabular ${a.balance < 0 ? "text-down" : "text-ink"}`}>{usd(a.balance)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
