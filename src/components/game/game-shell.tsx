"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Crosshair, Heart, Zap, Coins, Landmark, Skull, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatMoney, formatNumber } from "@/lib/format";
import { logoutAction } from "@/lib/actions/session";
import { usePlayer } from "@/hooks/use-player";
import { Countdown } from "@/components/game/countdown";
import { TravelBanner } from "@/components/game/travel-banner";
import { DetentionBanner } from "@/components/game/detention-banner";
import { isNavActive, MOBILE_PRIMARY, NAV_GROUPS } from "@/components/game/nav-config";
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

function NavItemLinks({
  items,
  pathname,
  onNavigate,
  unreadMessages,
}: {
  items: (typeof NAV_GROUPS)[number]["items"];
  pathname: string;
  onNavigate?: () => void;
  unreadMessages: number;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        const Icon = item.icon;
        const unread = item.href === "/game/berichten" ? unreadMessages : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {unread > 0 ? (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
                {unread}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

function CollapsibleNavGroup({
  label,
  startOpen,
  children,
}: {
  label: string;
  startOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-2 py-1 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
      >
        {label}
        <ChevronDown
          className={cn("size-3.5 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="pt-0.5">{children}</div> : null}
    </div>
  );
}
function NavLinks({
  onNavigate,
  collapsible = false,
  unreadMessages = 0,
}: {
  onNavigate?: () => void;
  collapsible?: boolean;
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-2.5" aria-label="Spelmenu">
      {NAV_GROUPS.map((group) => {
        const groupActive = group.items.some((item) => isNavActive(pathname, item.href));
        const links = (
          <NavItemLinks
            items={group.items}
            pathname={pathname}
            onNavigate={onNavigate}
            unreadMessages={unreadMessages}
          />
        );
        return (
          <section
            key={group.id}
            className={cn(
              "rounded-lg border p-1.5",
              groupActive
                ? "border-primary/35 bg-card/45"
                : "border-border/40 bg-card/25",
            )}
          >
            {collapsible ? (
              <CollapsibleNavGroup label={group.label} startOpen={groupActive}>
                {links}
              </CollapsibleNavGroup>
            ) : (
              <>
                <h2 className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {group.label}
                </h2>
                {links}
              </>
            )}
          </section>
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
  const pathname = usePathname();
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const nextExp = p.nextRank?.minExp ?? p.exp;
  const prevExp = p.rank.minExp;
  const expMax = Math.max(1, nextExp - prevExp);
  const expVal = Math.min(expMax, p.exp - prevExp);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-sidebar/80 p-3 md:flex md:flex-col">
        <Link href="/game" prefetch className="mb-4 px-1">
          <p className="font-heading text-xl tracking-wide text-primary">Onderwereld</p>
          <p className="text-xs text-muted-foreground">{p.displayName?.trim() || p.username} · {p.currentCityName}</p>
        </Link>
        <div className="flex-1 overflow-y-auto pr-0.5">
          <NavLinks unreadMessages={p.unreadMessages} />
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
              <SheetContent side="left" className="overflow-y-auto bg-sidebar p-4">
                <SheetHeader>
                  <SheetTitle className="font-heading text-primary">Menu</SheetTitle>
                </SheetHeader>
                <NavLinks unreadMessages={p.unreadMessages} />
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
          <DetentionBanner player={p} />
          <TravelBanner player={p} />
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/70 bg-background/95 md:hidden">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
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
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto p-4">
            <SheetHeader>
              <SheetTitle>Navigatie</SheetTitle>
            </SheetHeader>
            <NavLinks collapsible unreadMessages={p.unreadMessages} />
            <form action={logoutAction} className="mt-4">
              <Button type="submit" variant="outline" className="w-full gap-2">
                <LogOut className="size-4" />
                Uitloggen
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
