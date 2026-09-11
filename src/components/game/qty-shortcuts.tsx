"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QtyShortcuts({
  max,
  onPick,
  disabled,
}: {
  max: number;
  onPick: (qty: number) => void;
  disabled?: boolean;
}) {
  const cap = Math.max(1, Math.floor(max));
  const items = [
    { label: "Min", n: 1 },
    { label: "25%", n: Math.max(1, Math.floor(cap * 0.25)) },
    { label: "50%", n: Math.max(1, Math.floor(cap * 0.5)) },
    { label: "MAX", n: cap },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          size="xs"
          variant="outline"
          disabled={disabled || cap < 1}
          className={cn("h-7 px-2 text-[11px]")}
          onClick={() => onPick(item.n)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
