"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { ActionResult, PlayerSnapshot } from "@/types/game";

async function fetchPlayer(): Promise<PlayerSnapshot> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) throw new Error("Niet ingelogd");
  return res.json();
}

export function usePlayer(initial?: PlayerSnapshot) {
  return useQuery({
    queryKey: ["player"],
    queryFn: fetchPlayer,
    initialData: initial,
    staleTime: 8_000,
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
  });
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
      await queryClient.invalidateQueries({ queryKey: ["player"] });
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
