"use client";
import { useState } from "react";
import useSWR from "swr";
import type { Briefing, HistoryPoint, NewsItem, Portfolio } from "@/lib/types";
import { fetcher } from "@/lib/format";
import { Header } from "@/components/Header";
import { NetWorthHero } from "@/components/NetWorthHero";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Allocation } from "@/components/Allocation";
import { Accounts } from "@/components/Accounts";
import { Holdings } from "@/components/Holdings";
import { BriefingPanel } from "@/components/BriefingPanel";
import { Recommendations } from "@/components/Recommendations";
import { NewsFeed } from "@/components/NewsFeed";
import { AskJarvis } from "@/components/AskJarvis";
import { SetupBanner } from "@/components/SetupBanner";

type PortfolioRes = Portfolio & { errors: string[] };

export default function Dashboard() {
  const [thinking, setThinking] = useState(false);
  const [forcing, setForcing] = useState(false);

  // Live prices refresh every 20s; slower-moving data less often.
  const portfolio = useSWR<PortfolioRes>("/api/portfolio", fetcher, { refreshInterval: 20_000 });
  const history = useSWR<HistoryPoint[]>("/api/history", fetcher, { refreshInterval: 5 * 60_000 });
  const news = useSWR<{ items: NewsItem[]; demo: boolean }>("/api/news", fetcher, { refreshInterval: 5 * 60_000 });
  const briefing = useSWR<Briefing>("/api/briefing", fetcher, {
    refreshInterval: 30 * 60_000,
    revalidateOnFocus: false,
  });

  const refreshBriefing = async () => {
    setForcing(true);
    try {
      await briefing.mutate(fetcher<Briefing>("/api/briefing?refresh=1"), { revalidate: false });
    } finally {
      setForcing(false);
    }
  };

  const p = portfolio.data;
  const held = new Set(p?.holdings.map((h) => h.symbol) ?? []);

  return (
    <main className="mx-auto max-w-[1480px] space-y-5 px-4 py-6 sm:px-6">
      <Header
        live={p?.source === "plaid"}
        updatedAt={p?.updatedAt}
        thinking={thinking || forcing || (!briefing.data && !briefing.error)}
        onRefresh={() => {
          portfolio.mutate();
          news.mutate();
          history.mutate();
        }}
      />
      {p?.source === "demo" && <SetupBanner />}
      {p?.errors?.length ? (
        <div className="rounded-xl border border-warn/40 bg-warn/5 px-4 py-2.5 text-sm text-warn">
          Some connections need attention: {p.errors.join(" · ")}
        </div>
      ) : null}

      {!p ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="skeleton h-56 lg:col-span-2" />
          <div className="skeleton h-56" />
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <div className="flex flex-col gap-5">
              <NetWorthHero p={p} />
              <Allocation p={p} />
            </div>
            <BriefingPanel
              b={briefing.data}
              loading={forcing || briefing.isValidating}
              error={briefing.error?.message}
              onRefresh={refreshBriefing}
            />
          </div>

          <PerformanceChart history={history.data ?? []} demo={p.source === "demo"} />

          <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_1fr]">
            <Recommendations b={briefing.data} />
            <NewsFeed items={news.data?.items} held={held} demo={news.data?.demo} />
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Holdings p={p} />
            <Accounts accounts={p.accounts} />
          </div>
        </>
      )}
      <footer className="pb-20 pt-4 text-center text-[11px] text-ink-3">
        Data via Plaid &amp; Finnhub · Analysis by Claude · Not financial advice
      </footer>
      <AskJarvis onThinking={setThinking} />
    </main>
  );
}
