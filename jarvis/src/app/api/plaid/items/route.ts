import { NextResponse, type NextRequest } from "next/server";
import { removeItem } from "@/lib/plaid";

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await removeItem(id);
  return NextResponse.json({ ok: true });
}
