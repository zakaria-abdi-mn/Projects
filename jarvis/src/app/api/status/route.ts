import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { listItems } from "@/lib/plaid";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listItems();
  return NextResponse.json({
    plaid: config.plaidConfigured,
    plaidEnv: config.plaidEnv,
    finnhub: Boolean(config.finnhubKey),
    anthropic: config.anthropicConfigured,
    connections: items.map(({ itemId, institution, kind, addedAt }) => ({ itemId, institution, kind, addedAt })),
  });
}
