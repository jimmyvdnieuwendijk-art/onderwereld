import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { AirportClient } from "./airport-client";

export default async function VliegveldPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <AirportClient initialPlayer={player} />;
}
