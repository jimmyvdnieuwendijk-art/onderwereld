import { cn } from "@/lib/utils";

export function CardArt({
  src,
  alt,
  className,
  aspect = "video",
}: {
  src: string;
  alt: string;
  className?: string;
  aspect?: "video" | "square";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/50 bg-gradient-to-br from-zinc-900 to-red-950/40",
        aspect === "square" ? "aspect-square max-h-40 w-full" : "aspect-video w-full",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
        }}
      />
    </div>
  );
}
