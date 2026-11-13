import "server-only";
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type AccountBase,
  type InvestmentAccount,
} from "plaid/legacy";
import { config } from "./config";
import { readJson, writeJson } from "./store";
import type { Account, AccountKind, Holding } from "./types";

export interface StoredItem {
  itemId: string;
  accessToken: string;
  institution: string;
  kind: "bank" | "brokerage";
  addedAt: string;
}

const ITEMS_FILE = "plaid-items.json";

let client: PlaidApi | null = null;
export function plaid(): PlaidApi {
  if (!config.plaidConfigured) throw new Error("Plaid is not configured");
  if (!client) {
    client = new PlaidApi(
      new Configuration({
        basePath: PlaidEnvironments[config.plaidEnv],
        baseOptions: {
          headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
            "PLAID-SECRET": process.env.PLAID_SECRET!,
          },
        },
      }),
    );
  }
  return client;
}

export const listItems = () => readJson<StoredItem[]>(ITEMS_FILE, []);

export async function createLinkToken(kind: "bank" | "brokerage") {
  const res = await plaid().linkTokenCreate({
    user: { client_user_id: "jarvis-owner" },
    client_name: "Jarvis",
    // Two separate flows keep institution search clean: banks get balances +
    // transactions, brokerages (Robinhood, Fidelity, Schwab...) get holdings.
    products: kind === "brokerage" ? [Products.Investments] : [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return res.data.link_token;
}

export async function exchangePublicToken(
  publicToken: string,
  institution: string,
  kind: "bank" | "brokerage",
) {
  const res = await plaid().itemPublicTokenExchange({ public_token: publicToken });
  const items = await listItems();
  const next = items.filter((i) => i.itemId !== res.data.item_id);
  next.push({
    itemId: res.data.item_id,
    accessToken: res.data.access_token,
    institution,
    kind,
    addedAt: new Date().toISOString(),
  });
  await writeJson(ITEMS_FILE, next);
  invalidatePlaidCache();
}

export async function removeItem(itemId: string) {
  const items = await listItems();
  const item = items.find((i) => i.itemId === itemId);
  if (item) {
    await plaid().itemRemove({ access_token: item.accessToken }).catch(() => undefined);
    await writeJson(ITEMS_FILE, items.filter((i) => i.itemId !== itemId));
    invalidatePlaidCache();
  }
}

function kindOf(a: AccountBase | InvestmentAccount): AccountKind {
  const t = String(a.type);
  if (t === "depository" || t === "credit" || t === "investment" || t === "loan") return t;
  if (t === "brokerage") return "investment";
  return "other";
}

function toAccount(a: AccountBase | InvestmentAccount, item: StoredItem): Account {
  const kind = kindOf(a);
  const raw = a.balances.current ?? a.balances.available ?? 0;
  const debt = kind === "credit" || kind === "loan";
  return {
    id: a.account_id,
    itemId: item.itemId,
    institution: item.institution,
    name: a.official_name || a.name,
    mask: a.mask,
    kind,
    subtype: a.subtype ? String(a.subtype) : null,
    balance: debt ? -Math.abs(raw) : raw,
    currency: a.balances.iso_currency_code ?? "USD",
  };
}

// Plaid data changes slowly (institutions refresh a few times a day) and some
// endpoints are billed per call, so cache it. Live prices come from Finnhub.
const PLAID_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: { accounts: Account[]; holdings: Holding[]; errors: string[] } } | null =
  null;

export function invalidatePlaidCache() {
  cache = null;
}

export async function fetchPlaidData() {
  if (cache && Date.now() - cache.at < PLAID_TTL_MS) return cache.data;
  const items = await listItems();
  const accounts: Account[] = [];
  const holdings: Holding[] = [];
  const errors: string[] = [];

  await Promise.all(
    items.map(async (item) => {
      try {
        if (item.kind === "brokerage") {
          const res = await plaid().investmentsHoldingsGet({ access_token: item.accessToken });
          const secs = new Map(res.data.securities.map((s) => [s.security_id, s]));
          res.data.accounts.forEach((a) => accounts.push(toAccount(a, item)));
          for (const h of res.data.holdings) {
            const s = secs.get(h.security_id);
            const isCash = s?.is_cash_equivalent || s?.type === "cash";
            holdings.push({
              accountId: h.account_id,
              institution: item.institution,
              symbol: (isCash ? "CASH" : s?.ticker_symbol) || s?.name?.slice(0, 8) || "?",
              name: s?.name ?? "Unknown security",
              type: isCash ? "cash" : String(s?.type ?? "other"),
              quantity: h.quantity,
              price: h.institution_price,
              value: h.institution_value,
              costBasis: h.cost_basis,
            });
          }
        } else {
          const res = await plaid().accountsGet({ access_token: item.accessToken });
          res.data.accounts.forEach((a) => accounts.push(toAccount(a, item)));
        }
      } catch (e: unknown) {
        const code =
          (e as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code ??
          (e as Error).message;
        errors.push(`${item.institution}: ${code}`);
      }
    }),
  );

  const data = { accounts, holdings, errors };
  cache = { at: Date.now(), data };
  return data;
}
