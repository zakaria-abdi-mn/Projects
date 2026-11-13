import { NextResponse, type NextRequest } from "next/server";
import { createLinkToken } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  try {
    const { kind } = (await req.json()) as { kind: "bank" | "brokerage" };
    return NextResponse.json({ linkToken: await createLinkToken(kind === "brokerage" ? "brokerage" : "bank") });
  } catch (e) {
    const data = (e as { response?: { data?: { error_message?: string } } }).response?.data;
    return NextResponse.json({ error: data?.error_message ?? (e as Error).message }, { status: 500 });
  }
}
