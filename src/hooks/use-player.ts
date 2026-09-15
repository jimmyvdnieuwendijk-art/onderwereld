"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isActiveUntil, remainingMs } from "@/lib/format";
import { useNow } from "@/components/game/countdown";
import type { ActionResult, PlayerSnapshot } from "@/types/game";

async function fetchPlayer(): Promise<PlayerSnapshot> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) throw new Error("Niet ingelogd");
  return res.json();
}

function detentionMs(player: PlayerSnapshot | undefined) {
  if (!player) return 0;
  return Math.max(
    remainingMs(player.inJailUntil),
    remainingMs(player.inHospitalUntil),
    remainingMs(player.travelEndAt),
  );
}

/** Prefer the snapshot that still has an active lock (jail/hospital/flight). */
function mergePlayerSnapshot(current: PlayerSnapshot | undefined, incoming: PlayerSnapshot) {
  if (!current) return incoming;
  const curLock = detentionMs(current);
  const inLock = detentionMs(incoming);
  if (inLock > curLock + 400) return incoming;
  if (curLock > inLock + 400) return current;
  return incoming;
}

export function usePlayer(initial?: PlayerSnapshot) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!initial) return;
    queryClient.setQueryData(["player"], (current: PlayerSnapshot | undefined) =>
      mergePlayerSnapshot(current, initial),
    );
  }, [initial, queryClient]);

  return useQuery({
    queryKey: ["player"],
    queryFn: fetchPlayer,
    initialData: initial,
    initialDataUpdatedAt: initial ? Date.now() : undefined,
    placeholderData: (previous) => previous ?? initial,
    staleTime: 20_000,
    refetchInterval: (query) => (detentionMs(query.state.data) > 0 ? 10_000 : 60_000),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function useLivePlayer(initial?: PlayerSnapshot) {
  const { data } = usePlayer(initial);
  const now = useNow(1000);
  const player = data ?? initial ?? null;
  if (!player) return null;
  const traveling = isActiveUntil(player.travelEndAt, now);
  const hospital = isActiveUntil(player.inHospitalUntil, now);
  return {
    ...player,
    isTraveling: traveling,
    isDead: player.isDead && hospital,
  };
}

export function useGameAction() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);

  async function run(action: () => Promise<ActionResult>, onDone?: (result: ActionResult) => void) {
    if (pending) return;
    setPending(true);
    try {
      const result = await action();
      setFeedback(result);
      if (result.ok) toast.success(result.message);
      else if (result.variant === "warning") toast.warning(result.message);
      else toast.error(result.message);
      void queryClient.invalidateQueries({ queryKey: ["player"] });
      onDone?.(result);
    } catch (error) {
      console.error(error);
      const failed = { ok: false, message: "Er ging iets mis. Probeer opnieuw.", variant: "error" as const };
      setFeedback(failed);
      toast.error(failed.message);
    } finally {
      setPending(false);
    }
  }

  return { run, pending, feedback };
}
