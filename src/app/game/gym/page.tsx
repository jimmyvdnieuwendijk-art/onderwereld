import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { GymClient } from "./gym-client";

export const metadata = {
  title: "Gym",
};

export default async function GymPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <GymClient initialPlayer={player} />;
}
