import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { SmokkelClient } from "./smokkel-client";

export default async function SmokkelmarktPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <SmokkelClient initialPlayer={player} />;
}
