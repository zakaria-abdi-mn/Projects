import { NextResponse, type NextRequest } from "next/server";
import { getBriefing } from "@/lib/jarvis";
import { getNews } from "@/lib/news";
import { getPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const p = await getPortfolio();
    const { items } = await getNews(p.holdings);
    const force = req.nextUrl.searchParams.get("refresh") === "1";
    return NextResponse.json(await getBriefing(p, items, force));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
