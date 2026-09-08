import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { BankClient } from "./bank-client";

export default async function BankPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  return <BankClient initialPlayer={player} />;
}
