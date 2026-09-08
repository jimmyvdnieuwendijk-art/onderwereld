"use client";

import Link from "next/link";
import { Plane } from "lucide-react";
import { Countdown } from "@/components/game/countdown";
import type { PlayerSnapshot } from "@/types/game";

export function TravelBanner({ player }: { player: PlayerSnapshot }) {
  if (!player.isTraveling || !player.travelEndAt) return null;
  const dest = player.travelDestinationName ?? "een onbekende stad";
  return (
    <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
      <p className="flex flex-wrap items-center gap-2 font-medium text-primary">
        <Plane className="size-4" />
        Vlucht naar {dest} bezig… Resterende tijd:{" "}
        <Countdown until={player.travelEndAt} clock />
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Misdaden, aanvallen en de markt zijn gesloten tot je landt.{" "}
        <Link href="/game/vliegveld" className="underline">
          Naar het vliegveld
        </Link>
      </p>
    </div>
  );
}
