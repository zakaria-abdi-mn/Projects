import "server-only";
import { config } from "./config";
import { demoNews } from "./demo";
import type { NewsItem } from "./types";

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; key: string; items: NewsItem[] } | null = null;

interface FinnhubNews {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number; // seconds
  related?: string;
  image?: string;
}

const toItem = (n: FinnhubNews): NewsItem => ({
  id: String(n.id),
  headline: n.headline,
  summary: n.summary,
  source: n.source,
  url: n.url,
  datetime: n.datetime * 1000,
  related: n.related ? n.related.split(",").filter(Boolean) : undefined,
  image: n.image || undefined,
});

/** Market headlines plus company news for your largest stock/ETF positions. */
export async function getNews(
  holdings: { symbol: string; type: string }[],
): Promise<{ items: NewsItem[]; demo: boolean }> {
  if (!config.finnhubKey) return { items: demoNews(), demo: true };
  const tickers = holdings
    .filter((h) => h.type === "equity" || h.type === "etf")
    .map((h) => h.symbol)
    .slice(0, 6);
  const key = tickers.join(",");
  if (cache && cache.key === key && Date.now() - cache.at < TTL_MS) {
    return { items: cache.items, demo: false };
  }

  const day = (d: Date) => d.toISOString().slice(0, 10);
  const to = new Date();
  const from = new Date(Date.now() - 3 * 86400000);
  const base = "https://finnhub.io/api/v1";
  const get = async (url: string): Promise<FinnhubNews[]> => {
    try {
      const r = await fetch(`${url}&token=${config.finnhubKey}`, { cache: "no-store" });
      return r.ok ? ((await r.json()) as FinnhubNews[]) : [];
    } catch {
      return [];
    }
  };

  const [general, ...company] = await Promise.all([
    get(`${base}/news?category=general`),
    ...tickers.map((t) => get(`${base}/company-news?symbol=${t}&from=${day(from)}&to=${day(to)}`)),
  ]);
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  const add = (it: NewsItem) => {
    if (seen.has(it.headline)) return;
    seen.add(it.headline);
    items.push(it);
  };
  company.forEach((list, i) => list.slice(0, 4).forEach((n) => add({ ...toItem(n), related: [tickers[i]] })));
  general.slice(0, 12).forEach((n) => add(toItem(n)));
  items.sort((a, b) => b.datetime - a.datetime);
  cache = { at: Date.now(), key, items: items.slice(0, 30) };
  return { items: cache.items, demo: false };
}
