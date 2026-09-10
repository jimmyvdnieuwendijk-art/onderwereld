"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ambulance, Lock } from "lucide-react";
import { Countdown } from "@/components/game/countdown";
import { remainingMs } from "@/lib/format";
import type { PlayerSnapshot } from "@/types/game";

export function DetentionBanner({ player }: { player: PlayerSnapshot }) {
  const pathname = usePathname();
  const jailMs = remainingMs(player.inJailUntil);
  const hospitalMs = remainingMs(player.inHospitalUntil);
  const hospital = hospitalMs > 0 || player.isDead;
  const jail = jailMs > 0;

  if (!jail && !hospital) return null;
  if (jail && pathname.startsWith("/game/gevangenis")) return null;
  if (!jail && hospital && pathname.startsWith("/game/ziekenhuis")) return null;

  if (jail) {
    return (
      <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        <p className="flex flex-wrap items-center gap-2 font-medium text-destructive">
          <Lock className="size-4" />
          Je zit in de gevangenis. Resterend: <Countdown until={player.inJailUntil} />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Misdaden, handel, gym, casino en gevechten zijn gesloten.{" "}
          <Link href="/game/gevangenis" className="underline">
            Naar de gevangenis
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
      <p className="flex flex-wrap items-center gap-2 font-medium text-destructive">
        <Ambulance className="size-4" />
        Je ligt in het ziekenhuis.
        {hospitalMs > 0 ? (
          <>
            {" "}
            Resterend: <Countdown until={player.inHospitalUntil} />
          </>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Andere spelacties zijn geblokkeerd tot je ontslagen wordt.{" "}
        <Link href="/game/ziekenhuis" className="underline">
          Naar het ziekenhuis
        </Link>
      </p>
    </div>
  );
}
