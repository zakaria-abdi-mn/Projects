import type { Account, Holding, HistoryPoint, NewsItem, Quote } from "./types";

// Realistic sample data so the dashboard looks alive before any keys are set.
export const demoAccounts: Account[] = [
  { id: "chk", itemId: "demo-chase", institution: "Chase", name: "Total Checking", mask: "4417", kind: "depository", subtype: "checking", balance: 8420.55, currency: "USD" },
  { id: "sav", itemId: "demo-chase", institution: "Chase", name: "Premier Savings", mask: "9921", kind: "depository", subtype: "savings", balance: 25110.0, currency: "USD" },
  { id: "hys", itemId: "demo-ally", institution: "Ally Bank", name: "Online Savings", mask: "0038", kind: "depository", subtype: "savings", balance: 14250.12, currency: "USD" },
  { id: "amex", itemId: "demo-amex", institution: "American Express", name: "Gold Card", mask: "1005", kind: "credit", subtype: "credit card", balance: -2341.87, currency: "USD" },
  { id: "rh", itemId: "demo-rh", institution: "Robinhood", name: "Individual Brokerage", mask: "7731", kind: "investment", subtype: "brokerage", balance: 0, currency: "USD" },
  { id: "fid-roth", itemId: "demo-fid", institution: "Fidelity", name: "Roth IRA", mask: "2280", kind: "investment", subtype: "roth", balance: 0, currency: "USD" },
  { id: "fid-401k", itemId: "demo-fid", institution: "Fidelity", name: "401(k)", mask: "5512", kind: "investment", subtype: "401k", balance: 0, currency: "USD" },
  { id: "auto", itemId: "demo-cap1", institution: "Capital One", name: "Auto Loan", mask: "8800", kind: "loan", subtype: "auto", balance: -14200.0, currency: "USD" },
];

type Seed = Omit<Holding, "value" | "institution">;
const seeds: Seed[] = [
  { accountId: "rh", symbol: "NVDA", name: "NVIDIA Corp", type: "equity", quantity: 42, price: 182.4, costBasis: 4100 },
  { accountId: "rh", symbol: "TSLA", name: "Tesla Inc", type: "equity", quantity: 18, price: 338.1, costBasis: 5200 },
  { accountId: "rh", symbol: "AAPL", name: "Apple Inc", type: "equity", quantity: 30, price: 241.2, costBasis: 5400 },
  { accountId: "rh", symbol: "PLTR", name: "Palantir Technologies", type: "equity", quantity: 60, price: 128.7, costBasis: 2900 },
  { accountId: "rh", symbol: "AMD", name: "Advanced Micro Devices", type: "equity", quantity: 25, price: 164.3, costBasis: 3600 },
  { accountId: "rh", symbol: "CASH", name: "Brokerage Cash", type: "cash", quantity: 1840.22, price: 1, costBasis: 1840.22 },
  { accountId: "fid-roth", symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "etf", quantity: 48, price: 562.9, costBasis: 21000 },
  { accountId: "fid-roth", symbol: "QQQ", name: "Invesco QQQ Trust", type: "etf", quantity: 15, price: 528.4, costBasis: 6400 },
  { accountId: "fid-roth", symbol: "SCHD", name: "Schwab US Dividend Equity ETF", type: "etf", quantity: 120, price: 28.1, costBasis: 3200 },
  { accountId: "fid-401k", symbol: "FXAIX", name: "Fidelity 500 Index Fund", type: "mutual fund", quantity: 260, price: 221.6, costBasis: 42000 },
  { accountId: "fid-401k", symbol: "FSPSX", name: "Fidelity International Index", type: "mutual fund", quantity: 310, price: 52.3, costBasis: 14500 },
];

const instByAcct = Object.fromEntries(demoAccounts.map((a) => [a.id, a.institution]));
export const demoHoldings = (): Holding[] =>
  seeds.map((s) => ({ ...s, institution: instByAcct[s.accountId], value: s.quantity * s.price }));

// Simulated live market: a gentle random walk around a fixed "today" move per
// symbol, persisted in module memory so successive polls look continuous.
const dayBias: Record<string, number> = {
  NVDA: -0.031, TSLA: -0.042, AAPL: 0.004, PLTR: -0.024, AMD: -0.027,
  VOO: -0.009, QQQ: -0.014, SCHD: 0.003, FXAIX: -0.009, FSPSX: 0.002,
};
const walk: Record<string, number> = {};
export function demoQuotes(symbols: string[]): Record<string, Quote> {
  const out: Record<string, Quote> = {};
  for (const sym of symbols) {
    const seed = seeds.find((s) => s.symbol === sym);
    if (!seed || seed.type === "cash") continue;
    walk[sym] = (walk[sym] ?? dayBias[sym] ?? 0) + (Math.random() - 0.5) * 0.0016;
    const prevClose = seed.price;
    const price = prevClose * (1 + walk[sym]);
    out[sym] = { symbol: sym, price, prevClose, change: price - prevClose, changePct: walk[sym] * 100 };
  }
  return out;
}

export function demoHistory(currentNetWorth: number, currentInvested: number): HistoryPoint[] {
  // 2 years of daily points ending today, with realistic drawdowns + savings.
  const days = 730;
  const pts: HistoryPoint[] = [];
  let rng = 42;
  const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647) - 0.5;
  let inv = 1;
  const invSeries: number[] = [];
  for (let i = 0; i < days; i++) {
    const shock = i > 380 && i < 420 ? -0.004 : 0; // a correction ~11 months ago
    inv *= 1 + 0.00045 + shock + rand() * 0.018;
    invSeries.push(inv);
  }
  const scale = currentInvested / invSeries[days - 1];
  const cashNow = currentNetWorth - currentInvested;
  const now = Date.now();
  for (let i = 0; i < days; i++) {
    const invested = invSeries[i] * scale * (0.72 + 0.28 * (i / days)); // contributions over time
    const cash = cashNow * (0.6 + 0.4 * (i / days)) + rand() * 900;
    pts.push({ t: now - (days - 1 - i) * 86400000, invested, netWorth: invested + cash });
  }
  pts[pts.length - 1] = { t: now, invested: currentInvested, netWorth: currentNetWorth };
  return pts;
}

export function demoNews(): NewsItem[] {
  const now = Date.now();
  const n = (h: number) => now - h * 3600_000;
  return [
    { id: "d1", headline: "Chip stocks slide as new export curbs weigh on AI names", summary: "Semiconductor shares led the Nasdaq lower after reports of tighter export restrictions on advanced AI accelerators. NVIDIA and AMD fell more than 2%.", source: "Demo Wire", url: "#", datetime: n(1), related: ["NVDA", "AMD"] },
    { id: "d2", headline: "Tesla drops after delivery estimates are cut for Q4", summary: "Analysts trimmed fourth-quarter delivery forecasts citing softer demand in Europe and China.", source: "Demo Wire", url: "#", datetime: n(2), related: ["TSLA"] },
    { id: "d3", headline: "Treasury yields climb ahead of CPI print; rate-cut odds fade", summary: "The 10-year yield rose to its highest in six weeks as traders priced fewer Fed cuts, pressuring high-multiple growth stocks.", source: "Demo Wire", url: "#", datetime: n(3) },
    { id: "d4", headline: "Apple holds steady as services revenue hits a record", summary: "Defensive mega-caps outperformed while growth names sold off.", source: "Demo Wire", url: "#", datetime: n(5), related: ["AAPL"] },
    { id: "d5", headline: "Palantir pulls back after a 40% three-month run", summary: "Profit taking hit high-momentum software names; analysts note valuation remains stretched.", source: "Demo Wire", url: "#", datetime: n(6), related: ["PLTR"] },
    { id: "d6", headline: "Dividend ETFs see record inflows as investors rotate to value", summary: "Funds like SCHD drew steady inflows as investors hedge against tech volatility.", source: "Demo Wire", url: "#", datetime: n(9), related: ["SCHD"] },
    { id: "d7", headline: "High-yield savings rates hold above 4% at online banks", summary: "Online banks keep savings APYs elevated even as the Fed signals a slower path.", source: "Demo Wire", url: "#", datetime: n(14) },
  ];
}
