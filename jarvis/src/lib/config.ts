export const config = {
  plaidConfigured: Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
  plaidEnv: (process.env.PLAID_ENV ?? "sandbox") as "sandbox" | "production",
  finnhubKey: process.env.FINNHUB_API_KEY || "",
  anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
};
