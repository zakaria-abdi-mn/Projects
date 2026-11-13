import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";
import { portfolioContext } from "./portfolio";
import type { Briefing, NewsItem, Portfolio } from "./types";

const MODEL = "claude-opus-5-5";
// Server-side refusal fallback: if a safety classifier declines a request,
// the API re-runs it on a suitable fallback model inside the same call.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

const PERSONA = `You are JARVIS, a calm, sharp, slightly witty personal finance assistant inside the user's private dashboard. You can see their real accounts and holdings (below). You speak directly to them ("you"), lead with what matters, and use specific numbers from their data. You explain market moves in plain English, tie news to their actual positions, and give concrete, actionable suggestions (rebalancing, concentration risk, cash drag, high-interest debt, emergency fund, tax-advantaged accounts, tax-loss harvesting) with the reasoning. You are not a licensed advisor: frame suggestions as things to consider, never guarantee returns, and never tell them to make panic moves on a single day's drop.`;

const briefingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mood", "headline", "summary", "whyMoved", "recommendations", "risks"],
  properties: {
    mood: { type: "string", enum: ["bullish", "bearish", "neutral"] },
    headline: { type: "string", description: "One punchy line, under 90 characters." },
    summary: {
      type: "string",
      description: "2-4 sentences: how their money did today and the main reason.",
    },
    whyMoved: {
      type: "array",
      description: "The 3-5 positions that moved their portfolio most today, largest $ impact first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["symbol", "impact", "explanation"],
        properties: {
          symbol: { type: "string" },
          impact: { type: "number", description: "Today's $ change for this position (negative if down)." },
          explanation: { type: "string", description: "Why it moved today, citing the news driver." },
        },
      },
    },
    recommendations: {
      type: "array",
      description: "3-5 concrete suggestions based on their actual accounts.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "priority", "category"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          category: {
            type: "string",
            enum: ["rebalance", "risk", "cash", "debt", "tax", "savings", "opportunity", "watch"],
          },
        },
      },
    },
    risks: { type: "array", items: { type: "string" }, description: "Upcoming events or risks to watch (earnings, CPI, Fed, etc.)." },
  },
} as const;

let briefingCache: { at: number; b: Briefing } | null = null;
const BRIEFING_TTL_MS = 30 * 60 * 1000;

export async function getBriefing(p: Portfolio, news: NewsItem[], force = false): Promise<Briefing> {
  if (!config.anthropicConfigured) return demoBriefing(p);
  if (!force && briefingCache && Date.now() - briefingCache.at < BRIEFING_TTL_MS) return briefingCache.b;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const headlines = news
    .slice(0, 15)
    .map((n) => `- [${new Date(n.datetime).toISOString().slice(0, 16)}] ${n.headline}${n.related?.length ? ` (${n.related.join(",")})` : ""}`)
    .join("\n");

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Today is ${today}. Write my daily briefing.

<portfolio>
${portfolioContext(p)}
</portfolio>

<headlines>
${headlines || "(none available)"}
</headlines>

Use web search to confirm why my biggest movers moved today and to check for market-wide drivers (rates, CPI, Fed, earnings) if the headlines don't explain it. Then return the briefing.`,
    },
  ];

  let response: Anthropic.Beta.BetaMessage | null = null;
  // Server tools can return pause_turn on long searches; resume up to 3 times.
  for (let i = 0; i < 3; i++) {
    response = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: PERSONA,
      output_config: { effort: "medium", format: { type: "json_schema", schema: briefingSchema } },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      messages,
    });
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
  }
  if (!response) throw new Error("No response from Claude");
  if (response.stop_reason === "refusal") throw new Error("Jarvis declined to generate this briefing.");

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  const start = text.indexOf("{");
  const parsed = JSON.parse(text.slice(start, text.lastIndexOf("}") + 1)) as Omit<Briefing, "generatedAt" | "source">;

  const sources: { title: string; url: string }[] = [];
  for (const block of response.content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) if (r.type === "web_search_result") sources.push({ title: r.title, url: r.url });
    }
  }

  const b: Briefing = { ...parsed, generatedAt: new Date().toISOString(), source: "claude", sources: sources.slice(0, 8) };
  briefingCache = { at: Date.now(), b };
  return b;
}

/** Streams a chat answer about the user's finances as plain text chunks. */
export function chatStream(p: Portfolio, history: { role: "user" | "assistant"; content: string }[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!config.anthropicConfigured) {
        controller.enqueue(
          encoder.encode(
            "I'm running in demo mode. Add ANTHROPIC_API_KEY to .env.local and restart, and I'll answer questions about your actual accounts, look up the news, and suggest next steps.",
          ),
        );
        controller.close();
        return;
      }
      try {
        const stream = anthropic().beta.messages.stream({
          model: MODEL,
          max_tokens: 64000,
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          system: `${PERSONA}\n\nToday is ${new Date().toDateString()}. Keep answers tight (short paragraphs or bullets) unless asked for depth. Use web search for anything time-sensitive.\n\n<portfolio>\n${portfolioContext(p)}\n</portfolio>`,
          output_config: { effort: "medium" },
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
          messages: history.slice(-20),
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n(I can't help with that one.)"));
      } catch (e) {
        const msg =
          e instanceof Anthropic.AuthenticationError
            ? "My Anthropic API key was rejected. Check ANTHROPIC_API_KEY."
            : e instanceof Anthropic.RateLimitError
              ? "I'm being rate limited. Try again in a moment."
              : e instanceof Anthropic.APIError
                ? `API error ${e.status}: ${e.message}`
                : (e as Error).message;
        controller.enqueue(encoder.encode(`\n\n⚠ ${msg}`));
      }
      controller.close();
    },
  });
}

/** Rule-based briefing used before an Anthropic key is configured. */
function demoBriefing(p: Portfolio): Briefing {
  const movers = [...p.holdings]
    .filter((h) => h.dayChange != null)
    .sort((a, b) => Math.abs(b.dayChange!) - Math.abs(a.dayChange!))
    .slice(0, 4);
  const down = p.dayChange < 0;
  const fmt = (n: number) => `$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
  const why: Record<string, string> = {
    NVDA: "Chip stocks sold off on reports of tighter AI-accelerator export curbs.",
    AMD: "Fell in sympathy with NVIDIA on the same export-restriction headlines.",
    TSLA: "Analysts cut Q4 delivery estimates on softer demand in Europe and China.",
    PLTR: "Profit-taking after a big three-month run; valuation concerns resurfaced.",
    QQQ: "The Nasdaq-100 dropped as rising yields hit high-multiple tech.",
    VOO: "The broad market slipped as rate-cut odds faded ahead of CPI.",
    FXAIX: "Tracks the S&P 500, which slipped as rate-cut odds faded ahead of CPI.",
  };
  const top = p.holdings.filter((h) => h.type !== "cash")[0];
  const topPct = top && p.invested ? (top.value / p.invested) * 100 : 0;
  const rh = p.accounts.find((a) => a.institution === "Robinhood");
  const rhTech = p.holdings.filter((h) => h.accountId === rh?.id && h.type === "equity");
  const debt = p.accounts.find((a) => a.kind === "credit");
  return {
    generatedAt: new Date().toISOString(),
    source: "demo",
    mood: down ? "bearish" : "bullish",
    headline: down
      ? `Tech-heavy day: you're down ${fmt(p.dayChange)} as chips and EVs slide`
      : `Green day: you're up ${fmt(p.dayChange)}`,
    summary: `Your investments are ${down ? "down" : "up"} ${fmt(p.dayChange)} (${p.dayChangePct.toFixed(2)}%) today. Most of the move comes from your Robinhood account, which is concentrated in a few high-beta tech names. Your Fidelity index funds and SCHD are holding up much better. Net worth stands at ${fmt(p.netWorth)}.`,
    whyMoved: movers.map((h) => ({
      symbol: h.symbol,
      impact: h.dayChange!,
      explanation: why[h.symbol] ?? "Moved with the broader market today.",
    })),
    recommendations: [
      {
        title: "Your Robinhood account is a concentrated tech bet",
        detail: `${rhTech.map((h) => h.symbol).join(", ")} are all high-beta tech, so they tend to fall together, as they did today. Consider capping single stocks at about 5-10% of your total investments and sending new contributions to broad index funds until you're back in range.`,
        priority: "high",
        category: "risk",
      },
      {
        title: "Don't sell on a one-day drop",
        detail: "Today's decline is driven by sector headlines, not by anything breaking in your long-term plan. If you want to act, rebalance on a set schedule (for example quarterly) rather than reacting intraday.",
        priority: "medium",
        category: "watch",
      },
      {
        title: "Move idle checking cash to high-yield savings",
        detail: `You keep a lot of cash in Chase accounts earning close to 0%. Keeping about one month of expenses in checking and moving the rest to your Ally savings (~4% APY) could earn several hundred dollars a year.`,
        priority: "medium",
        category: "cash",
      },
      ...(debt
        ? [
            {
              title: `Pay the ${debt.institution} balance in full`,
              detail: `${fmt(debt.balance)} on a card at roughly 20%+ APR costs more than your portfolio is likely to earn. Pay it off before adding to taxable investments.`,
              priority: "high" as const,
              category: "debt",
            },
          ]
        : []),
      {
        title: "Tax-loss harvesting check",
        detail: `${top?.symbol ?? "Your largest holding"} is ${topPct.toFixed(0)}% of your investments. If any taxable Robinhood lots are below cost basis, selling and swapping into a similar (not substantially identical) fund can lock in a loss you can use against gains.`,
        priority: "low",
        category: "tax",
      },
    ],
    risks: [
      "CPI inflation report this week; a hot print could push yields higher and hit growth stocks.",
      "NVIDIA earnings later this month; it's one of your largest single-stock positions.",
      "Next Fed meeting: watch the tone on further rate cuts.",
    ],
  };
}
