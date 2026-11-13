import { NextResponse } from "next/server";
import { getHistory, getPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export async function GET() {
  const p = await getPortfolio();
  return NextResponse.json(await getHistory(p));
}
