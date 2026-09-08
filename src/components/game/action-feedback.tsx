"use client";

import { useActionState, useEffect } from "react";
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
  return useActionState(action, null);
}
