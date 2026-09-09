import type { ReactNode } from "react";
import Link from "next/link";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-blood/20 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 block text-center">
          <p className="font-heading text-sm tracking-[0.35em] text-primary">ONDERWERELD</p>
          <span className="gold-line mx-auto mt-2 block h-px w-24" />
        </Link>

        <div className="rounded-2xl border border-primary/20 bg-card/90 p-6 shadow-[0_0_40px_oklch(0.55_0.18_25_/_0.12)] backdrop-blur-sm">
          <h1 className="font-heading text-2xl">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          <div className="mt-5">{children}</div>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}

export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function DemoHint() {
  return (
    <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      Demo: <span className="text-foreground">demo@onderwereld.nl</span>
      {" / "}
      <span className="text-foreground">demo1234</span>
    </p>
  );
}
