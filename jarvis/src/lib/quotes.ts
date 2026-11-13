import "server-only";
import { config } from "./config";
import { demoQuotes } from "./demo";
import type { Quote } from "./types";

// Finnhub free tier: 60 calls/min. Cache each symbol briefly so a dashboard
// polling every ~20s with a dozen tickers stays under the limit.
const TTL_MS = 20_000;
const cache = new Map<string, { at: number; q: Quote | null }>();

async function finnhubQuote(symbol: string): Promise<Quote | null> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.q;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${config.finnhubKey}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { c: number; d: number | null; dp: number | null; pc: number };
    // Finnhub returns zeros for symbols it doesn't cover (e.g. many mutual funds).
    const q = j.c ? { symbol, price: j.c, change: j.d ?? 0, changePct: j.dp ?? 0, prevClose: j.pc } : null;
    cache.set(symbol, { at: Date.now(), q });
    return q;
  } catch {
    return hit?.q ?? null;
  }
}

export async function getQuotes(symbols: string[], demo: boolean): Promise<Record<string, Quote>> {
  const unique = [...new Set(symbols.filter((s) => s && s !== "CASH"))];
  if (!config.finnhubKey) return demo ? demoQuotes(unique) : {};
  const results = await Promise.all(unique.map(finnhubQuote));
  const out: Record<string, Quote> = {};
  results.forEach((q) => q && (out[q.symbol] = q));
  // In demo mode, fill gaps (mutual funds Finnhub doesn't price) with simulated quotes.
  if (demo) {
    const missing = unique.filter((s) => !out[s]);
    Object.assign(out, demoQuotes(missing));
  }
  return out;
}
