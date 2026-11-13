import { NextResponse, type NextRequest } from "next/server";
import { exchangePublicToken } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  try {
    const { publicToken, institution, kind } = (await req.json()) as {
      publicToken: string;
      institution?: string;
      kind: "bank" | "brokerage";
    };
    await exchangePublicToken(publicToken, institution || "Unknown institution", kind);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
