"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/game/account", label: "Profiel" },
  { href: "/game/account/prestaties", label: "Prestaties" },
] as const;

export function AccountSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex w-fit gap-1 rounded-lg border border-[#d4a359]/20 bg-[#120e0a] p-1">
      {TABS.map((tab) => {
        const active =
          tab.href === "/game/account"
            ? pathname === "/game/account"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-[#d4a359]/15 text-[#d4a359]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
