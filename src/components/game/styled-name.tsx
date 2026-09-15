import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isSafeNameColor, titlePrefix } from "@/lib/player-name";

export function StyledPlayerName({
  displayName,
  title,
  color,
  className,
  titleClassName,
}: {
  displayName: string;
  title?: string | null;
  color?: string | null;
  className?: string;
  titleClassName?: string;
}) {
  const prefix = titlePrefix(title);
  const safe = isSafeNameColor(color) ? color : undefined;
  return (
    <span className={cn("inline", className)}>
      {prefix ? (
        <span className={cn("mr-1 font-normal text-[#d4a359]/85", titleClassName)}>{prefix}</span>
      ) : null}
      <span style={safe ? { color: safe } : undefined}>{displayName}</span>
    </span>
  );
}

export function IdentityPreview({
  displayName,
  title,
  color,
  children,
}: {
  displayName: string;
  title?: string | null;
  color?: string | null;
  children?: ReactNode;
}) {
  return (
    <p className="font-heading text-lg">
      <StyledPlayerName displayName={displayName} title={title} color={color} />
      {children}
    </p>
  );
}
