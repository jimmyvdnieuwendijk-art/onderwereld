import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/actions/helpers";

export async function GET() {
  const player = await requirePlayer();
  if (!player) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  return NextResponse.json(player);
}
