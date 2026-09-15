import { facebookSignInAction } from "@/lib/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FacebookAuthButton({
  enabled,
  label = "Doorgaan met Facebook",
}: {
  enabled: boolean;
  label?: string;
}) {
  if (!enabled) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          disabled
          className={cn(buttonVariants({ variant: "outline" }), "w-full opacity-60")}
        >
          {label}
        </button>
        <p className="text-center text-[11px] leading-snug text-muted-foreground">
          Facebook-login is nog niet actief. Zet <span className="font-mono">AUTH_FACEBOOK_ID</span>{" "}
          en <span className="font-mono">AUTH_FACEBOOK_SECRET</span> in Vercel.
        </p>
      </div>
    );
  }

  return (
    <form action={facebookSignInAction}>
      <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
        {label}
      </button>
    </form>
  );
}

export function AuthMethodDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">of</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
