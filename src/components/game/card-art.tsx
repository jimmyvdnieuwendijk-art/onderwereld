"use client";

import Image from "next/image";
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
      <Image
        src={src}
        alt={alt}
        fill
        sizes={
          aspect === "square"
            ? "(max-width: 768px) 40vw, 160px"
            : "(max-width: 768px) 100vw, 480px"
        }
        quality={50}
        priority={priority}
        className="object-cover"
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
        }}
      />
    </div>
  );
}
