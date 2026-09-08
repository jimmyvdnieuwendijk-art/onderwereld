"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Crosshair, Heart, Zap, Coins, Landmark, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatMoney, formatNumber } from "@/lib/format";
import { logoutAction } from "@/lib/actions/session";
import { usePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import { TravelBanner } from "@/components/game/travel-banner";
import { MOBILE_PRIMARY, NAV_ITEMS } from "@/components/game/nav-config";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";

function Meter({
  value,
  max,
  barClass,
}: {
  value: number;
  max: number;
  barClass: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function GameShell({
  children,
  initialPlayer,
}: {
  children: ReactNode;
  initialPlayer: PlayerSnapshot;
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const nextExp = p.nextRank?.minExp ?? p.exp;
  const prevExp = p.rank.minExp;
  const expMax = Math.max(1, nextExp - prevExp);
  const expVal = Math.min(expMax, p.exp - prevExp);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-sidebar/80 p-4 md:flex md:flex-col">
        <Link href="/game" className="mb-6 px-1">
          <p className="font-heading text-xl tracking-wide text-primary">Onderwereld</p>
          <p className="text-xs text-muted-foreground">{p.username} · {p.currentCityName}</p>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <form action={logoutAction} className="mt-4">
          <Button type="submit" variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="size-4" />
            Uitloggen
          </Button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
          <div className="flex items-center gap-2 px-3 py-2 md:px-5">
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="md:hidden" />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="bg-sidebar p-4">
                <SheetHeader>
                  <SheetTitle className="font-heading text-primary">Menu</SheetTitle>
                </SheetHeader>
                <NavLinks />
                <form action={logoutAction} className="mt-4">
                  <Button type="submit" variant="outline" className="w-full">
                    Uitloggen
                  </Button>
                </form>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm">
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <Coins className="size-3.5" />
                  {formatMoney(p.cash)}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Landmark className="size-3.5" />
                  {formatMoney(p.bankBalance)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Crosshair className="size-3.5" />
                  {formatNumber(p.bullets)}
                </span>
                <span className="hidden items-center gap-1 sm:inline-flex">
                  <Skull className="size-3.5" />
                  {p.killCount}
                </span>
                {p.unreadMessages > 0 && (
                  <Badge variant="destructive">{p.unreadMessages} nieuw</Badge>
                )}
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2 md:max-w-xl">
                <div>
                  <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="size-3" /> HP
                    </span>
                    <span className="tabular-nums">
                      {p.health}/100
                    </span>
                  </div>
                  <Meter value={p.health} max={100} barClass="bg-destructive" />
                </div>
                <div>
                  <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Zap className="size-3" /> Energie
                    </span>
                    <span className="tabular-nums">{p.energy}/100</span>
                  </div>
                  <Meter value={p.energy} max={100} barClass="bg-primary" />
                </div>
                <div>
                  <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>{p.rank.name}</span>
                    <span className="tabular-nums">
                      {p.nextRank ? `${formatNumber(p.exp)}/${formatNumber(p.nextRank.minExp)}` : "MAX"}
                    </span>
                  </div>
                  <Meter value={expVal} max={expMax} barClass="bg-emerald-500" />
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <Countdown until={p.crimeCooldownUntil} label="Misdaad:" />
                <Countdown until={p.carTheftCooldownUntil} label="Auto:" />
                <Countdown until={p.gymCooldownUntil} label="Gym:" />
                <Countdown until={p.casinoCooldownUntil} label="Casino:" />
                <Countdown until={p.inJailUntil} label="Cel:" />
                <Countdown until={p.inHospitalUntil} label="Ziekenhuis:" />
                <Countdown until={p.travelEndAt} label="Vlucht:" clock />
                {p.wantedLevel > 0 && <span>Gezocht {p.wantedLevel}</span>}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 md:px-6 md:py-6">
          <TravelBanner player={p} />
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/70 bg-background/95 md:hidden">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground"
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        <Sheet>
          <SheetTrigger className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground">
            <Menu className="size-4" />
            Meer
          </SheetTrigger>
          <SheetContent side="bottom" className="p-4">
            <SheetHeader>
              <SheetTitle>Navigatie</SheetTitle>
            </SheetHeader>
            <NavLinks />
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
