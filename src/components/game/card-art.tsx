"use client";

import { cn } from "@/lib/utils";

export function CardArt({
  src,
  alt,
  className,
  aspect = "video",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  aspect?: "video" | "square";
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/50 bg-gradient-to-br from-zinc-900 to-red-950/40",
        aspect === "square" ? "aspect-square max-h-40 w-full" : "aspect-video w-full",
        className,
      )}
    >
      {/* Native img: some catalog JPEGs are incomplete stubs; next/image optimizer 400s them. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={aspect === "square" ? 320 : 640}
        height={aspect === "square" ? 320 : 360}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
        }}
      />
    </div>
  );
}
