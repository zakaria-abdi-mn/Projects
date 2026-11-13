import "server-only";
import { config } from "./config";
import { demoAccounts, demoHistory, demoHoldings } from "./demo";
import { fetchPlaidData, listItems } from "./plaid";
import { getQuotes } from "./quotes";
import { readJson, writeJson } from "./store";
import type { Account, HistoryPoint, Holding, Portfolio } from "./types";

export async function isDemoMode() {
  if (!config.plaidConfigured) return true;
  return (await listItems()).length === 0;
}

export async function getPortfolio(): Promise<Portfolio & { errors: string[] }> {
  const demo = await isDemoMode();
  let accounts: Account[];
  let holdings: Holding[];
  let errors: string[] = [];
  if (demo) {
    accounts = demoAccounts.map((a) => ({ ...a }));
    holdings = demoHoldings();
  } else {
    const d = await fetchPlaidData();
    accounts = d.accounts.map((a) => ({ ...a }));
    holdings = d.holdings.map((h) => ({ ...h }));
    errors = d.errors;
  }

  // Apply live quotes to every priced position.
  const quotes = await getQuotes(holdings.map((h) => h.symbol), demo);
  for (const h of holdings) {
    const q = quotes[h.symbol];
    if (!q) continue;
    h.price = q.price;
    h.value = h.quantity * q.price;
    h.dayChange = h.quantity * q.change;
    h.dayChangePct = q.changePct;
    h.live = true;
  }

  // Investment account balances = sum of their (live-priced) holdings.
  const byAcct = new Map<string, number>();
  holdings.forEach((h) => byAcct.set(h.accountId, (byAcct.get(h.accountId) ?? 0) + h.value));
  for (const a of accounts) {
    if (a.kind === "investment" && byAcct.has(a.id)) a.balance = byAcct.get(a.id)!;
  }

  const assets = accounts.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts.filter((a) => a.balance < 0).reduce((s, a) => s - a.balance, 0);
  const invested = accounts.filter((a) => a.kind === "investment").reduce((s, a) => s + a.balance, 0);
  const cash = accounts.filter((a) => a.kind === "depository").reduce((s, a) => s + a.balance, 0);
  const dayChange = holdings.reduce((s, h) => s + (h.dayChange ?? 0), 0);
  const withBasis = holdings.filter((h) => h.costBasis != null && h.type !== "cash");
  const totalGain = withBasis.length
    ? withBasis.reduce((s, h) => s + (h.value - (h.costBasis ?? 0)), 0)
    : null;

  const portfolio = {
    source: demo ? ("demo" as const) : ("plaid" as const),
    updatedAt: new Date().toISOString(),
    accounts,
    holdings: holdings.sort((a, b) => b.value - a.value),
    netWorth: assets - liabilities,
    assets,
    liabilities,
    cash,
    invested,
    dayChange,
    dayChangePct: invested - dayChange > 0 ? (dayChange / (invested - dayChange)) * 100 : 0,
    totalGain,
    institutions: [...new Set(accounts.map((a) => a.institution))],
    errors,
  };
  if (!demo) await recordSnapshot(portfolio.netWorth, portfolio.invested);
  return portfolio;
}

// ── Net-worth history ──────────────────────────────────────────────────────
// Plaid gives current balances, not history, so we snapshot whenever the
// dashboard is open (one point per 15 min) and chart from that.
const HISTORY_FILE = "history.json";
const SNAPSHOT_EVERY_MS = 15 * 60 * 1000;

async function recordSnapshot(netWorth: number, invested: number) {
  const hist = await readJson<HistoryPoint[]>(HISTORY_FILE, []);
  const last = hist[hist.length - 1];
  if (last && Date.now() - last.t < SNAPSHOT_EVERY_MS) {
    hist[hist.length - 1] = { ...last, netWorth, invested }; // keep latest value fresh
  } else {
    hist.push({ t: Date.now(), netWorth, invested });
  }
  await writeJson(HISTORY_FILE, hist.slice(-20000));
}

export async function getHistory(p: Portfolio): Promise<HistoryPoint[]> {
  if (p.source === "demo") return demoHistory(p.netWorth, p.invested);
  return readJson<HistoryPoint[]>(HISTORY_FILE, []);
}

/** Compact text summary of the portfolio for Claude. */
export function portfolioContext(p: Portfolio): string {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  const sign = (n: number) => (n >= 0 ? "+" : "-");
  const lines = [
    `Net worth: ${fmt(p.netWorth)} (assets ${fmt(p.assets)}, liabilities ${fmt(p.liabilities)})`,
    `Cash in bank accounts: ${fmt(p.cash)}. Invested: ${fmt(p.invested)}.`,
    `Today's investment change: ${sign(p.dayChange)}${fmt(Math.abs(p.dayChange))} (${p.dayChangePct.toFixed(2)}%)`,
    p.totalGain != null ? `Unrealized gain vs cost basis: ${fmt(p.totalGain)}` : "",
    "",
    "Accounts:",
    ...p.accounts.map(
      (a) => `- ${a.institution} ${a.name} [${a.kind}${a.subtype ? "/" + a.subtype : ""}]: ${fmt(a.balance)}`,
    ),
    "",
    "Holdings (symbol, account, value, % of investments, today's move, cost basis):",
    ...p.holdings.map((h) => {
      const acct = p.accounts.find((a) => a.id === h.accountId);
      const pct = p.invested ? ((h.value / p.invested) * 100).toFixed(1) : "?";
      const day =
        h.dayChange != null
          ? `${sign(h.dayChange)}${fmt(Math.abs(h.dayChange))} (${(h.dayChangePct ?? 0).toFixed(2)}%)`
          : "n/a";
      const basis = h.costBasis != null ? fmt(h.costBasis) : "n/a";
      return `- ${h.symbol} (${h.name}, ${h.type}) in ${acct?.institution} ${acct?.name}: ${fmt(h.value)}, ${pct}%, today ${day}, basis ${basis}`;
    }),
  ];
  return lines.join("\n");
}
