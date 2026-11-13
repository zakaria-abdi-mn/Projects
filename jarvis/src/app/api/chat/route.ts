import type { NextRequest } from "next/server";
import { chatStream } from "@/lib/jarvis";
import { getPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };
  const p = await getPortfolio();
  return new Response(chatStream(p, messages), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
