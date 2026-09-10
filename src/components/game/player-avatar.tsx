import { cn } from "@/lib/utils";

export function PlayerAvatar({
  url,
  username,
  className,
}: {
  url: string | null | undefined;
  username: string;
  className?: string;
}) {
  const initial = (username.trim()[0] ?? "?").toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dynamic avatar URLs (API or blob)
      <img
        src={url}
        alt={username}
        className={cn("rounded-full bg-muted object-cover", className)}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-full bg-muted font-heading text-primary",
        className,
      )}
    >
      {initial}
    </div>
  );
}
