"use client";

import { useActionState } from "react";
import { chooseUsernameAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { AuthError, AuthShell } from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";

export function UsernameForm({ suggested }: { suggested: string }) {
  const [state, action, pending] = useActionState(chooseUsernameAction, null);

  return (
    <AuthShell
      title="Kies je straatnaam"
      description="Facebook is gekoppeld. Kies de naam waaronder je de onderwereld in gaat."
      footer="Je kunt deze naam later niet zomaar wijzigen."
    >
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Gebruikersnaam</Label>
          <Input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={16}
            defaultValue={suggested}
            autoComplete="username"
          />
        </div>
        <AuthError message={state && !state.ok ? state.message : undefined} />
        <button type="submit" className={cn(buttonVariants(), "w-full")} disabled={pending}>
          {pending ? "Naam wordt gezet…" : "Naam vastzetten"}
        </button>
      </form>
    </AuthShell>
  );
}
