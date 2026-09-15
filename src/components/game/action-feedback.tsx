"use client";

import { useActionState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ActionResult } from "@/types/game";

export function ActionFeedback({ state }: { state: ActionResult | null }) {
  useEffect(() => {
    if (!state?.message) return;
    if (state.ok) toast.success(state.message);
    else if (state.variant === "warning") toast.warning(state.message);
    else toast.error(state.message);
  }, [state]);

  if (!state) return null;
  return (
    <p className={`text-sm ${state.ok ? "text-primary" : "text-destructive"}`}>{state.message}</p>
  );
}

export function useFormAction(action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>) {
  const queryClient = useQueryClient();
  const triple = useActionState(action, null);
  const [state] = triple;

  useEffect(() => {
    // Jail/hospital/travel warnings are `ok: false`. Still refresh the snapshot
    // so Overzicht/Gevangenis don't keep showing "je bent vrij".
    if (!state) return;
    void queryClient.invalidateQueries({ queryKey: ["player"] });
  }, [state, queryClient]);

  return triple;
}
