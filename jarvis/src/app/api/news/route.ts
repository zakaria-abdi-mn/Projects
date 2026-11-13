import { NextResponse } from "next/server";
import { getNews } from "@/lib/news";
import { getPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export async function GET() {
  const p = await getPortfolio();
  return NextResponse.json(await getNews(p.holdings));
}
