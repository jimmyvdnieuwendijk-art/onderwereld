"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MARKT_SUBNAV } from "@/lib/market";
import { cn } from "@/lib/utils";

export function MarktSubnav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-xl border border-[#d4a359]/25 bg-[#1a1510] p-1.5"
      aria-label="Markt"
    >
      {MARKT_SUBNAV.map((item) => {
        const active = item.href === "/game/markt" ? pathname === "/game/markt" : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              active ? "bg-[#d4a359]/15 text-[#d4a359]" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
