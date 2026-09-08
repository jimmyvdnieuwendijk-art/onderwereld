"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
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
    refetchInterval: 2500,
  });
}

export function useGameAction() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onDone?: (result: ActionResult) => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
      } else if (result.variant === "warning") {
        toast.warning(result.message);
      } else {
        toast.error(result.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["player"] });
      onDone?.(result);
    });
  }

  return { run, pending };
}
