export type AccountKind = "depository" | "credit" | "investment" | "loan" | "other";

export interface Account {
  id: string;
  itemId: string;
  institution: string;
  name: string;
  mask?: string | null;
  kind: AccountKind;
  subtype?: string | null;
  /** Signed contribution to net worth: assets positive, debts negative. */
  balance: number;
  currency: string;
}

export interface Holding {
  accountId: string;
  institution: string;
  symbol: string;
  name: string;
  type: string; // equity | etf | mutual fund | cash | crypto | ...
  quantity: number;
  price: number;
  value: number;
  costBasis?: number | null;
  /** Live-quote fields (filled in when a quote is available). */
  dayChange?: number; // $ change today for this position
  dayChangePct?: number;
  live?: boolean;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  prevClose: number;
}

export interface Portfolio {
  source: "demo" | "plaid";
  updatedAt: string;
  accounts: Account[];
  holdings: Holding[];
  netWorth: number;
  assets: number;
  liabilities: number;
  cash: number;
  invested: number;
  dayChange: number;
  dayChangePct: number;
  totalGain: number | null;
  institutions: string[];
}

export interface HistoryPoint {
  t: number; // epoch ms
  netWorth: number;
  invested: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number; // epoch ms
  related?: string[];
  image?: string;
}

export interface Briefing {
  generatedAt: string;
  source: "claude" | "demo";
  mood: "bullish" | "bearish" | "neutral";
  headline: string;
  summary: string;
  whyMoved: { symbol: string; impact: number; explanation: string }[];
  recommendations: {
    title: string;
    detail: string;
    priority: "high" | "medium" | "low";
    category: string;
  }[];
  risks: string[];
  sources?: { title: string; url: string }[];
}
