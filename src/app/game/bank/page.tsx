import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/actions/helpers";
import { BankClient } from "./bank-client";

export default async function BankPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <BankClient initialPlayer={player} />;
}
