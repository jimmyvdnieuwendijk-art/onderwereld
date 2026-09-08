import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { CasinoClient } from "./casino-client";

export const metadata = {
  title: "Casino",
};

export default async function CasinoPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <CasinoClient initialPlayer={player} />;
}
