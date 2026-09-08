"use client";

import {
  assignToWindowForm,
  buyListedEscortForm,
  collectPimpIncomeForm,
  hireWindowForm,
  listEscortForm,
  recruitEscortForm,
  setMainEscortForm,
  transferToStateForm,
  unassignFromWindowForm,
  unlistEscortForm,
} from "@/lib/actions/pimp";
import { PIMP_RANKS, RECRUIT_COST, TRANSFER_CITIES, nextPimpRank, pimpRankFor } from "@/lib/pimp";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlayer } from "@/hooks/use-player";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { EscortDTO, MarketEscortDTO, WindowDTO } from "./types";

function Meter({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>{pct}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function HoerenClient({
  initialPlayer,
  escorts,
  windows,
  market,
  logs,
}: {
  initialPlayer: PlayerSnapshot;
  escorts: EscortDTO[];
  windows: WindowDTO[];
  market: MarketEscortDTO[];
  logs: { id: string; message: string; createdAt: string }[];
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const router = useRouter();
  const rank = pimpRankFor(p.pimpExp);
  const next = nextPimpRank(p.pimpExp);
  const cap = rank.maxWorkers === 0 ? "onbeperkt" : String(rank.maxWorkers);
  const main = escorts.find((row) => row.id === p.mainEscortId) ?? escorts.find((row) => row.isMain) ?? null;
  const localEscorts = escorts.filter((row) => row.cityId === p.currentCity && !row.listedPrice);

  const [recruitState, recruitAction, recruiting] = useFormAction(recruitEscortForm);
  const [hireState, hireAction, hiring] = useFormAction(hireWindowForm);
  const [assignState, assignAction, assigning] = useFormAction(assignToWindowForm);
  const [unassignState, unassignAction, unassigning] = useFormAction(unassignFromWindowForm);
  const [transferState, transferAction, transferring] = useFormAction(transferToStateForm);
  const [mainState, mainAction, settingMain] = useFormAction(setMainEscortForm);
  const [listState, listAction, listing] = useFormAction(listEscortForm);
  const [unlistState, unlistAction, unlisting] = useFormAction(unlistEscortForm);
  const [buyState, buyAction, buying] = useFormAction(buyListedEscortForm);
  const [collectState, collectAction, collecting] = useFormAction(collectPimpIncomeForm);

  const states = [
    recruitState,
    hireState,
    assignState,
    unassignState,
    transferState,
    mainState,
    listState,
    unlistState,
    buyState,
    collectState,
  ];

  useEffect(() => {
    if (states.some((row) => row?.ok)) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recruitState, hireState, assignState, unassignState, transferState, mainState, listState, unlistState, buyState, collectState]);

  const busy = recruiting || hiring || assigning || unassigning || transferring || settingMain || listing || unlisting || buying || collecting;
  const razziaCity = p.wantedLevel >= 40;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-red-500/30">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/game/hoeren/header.jpg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
        <div className="relative space-y-3 px-5 py-8 md:px-8">
          <p className="text-[11px] tracking-[0.25em] text-red-300 uppercase">Rosse buurt · {p.currentCityName}</p>
          <h1 className="font-heading text-3xl text-white md:text-4xl">Hoeren</h1>
          <p className="max-w-xl text-sm text-zinc-200">
            Glamour aan de voorkant, afdracht achter de schermen. Huur ramen in deze stad, zet je crew erachter,
            en houd de zwaailichten in de gaten.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-red-700 text-white">{rank.name}</Badge>
            <Badge variant="secondary">
              Crew {p.workerCount}/{cap}
            </Badge>
            <Badge variant="outline">Pimp-exp {p.pimpExp}</Badge>
            <Badge variant={razziaCity ? "destructive" : "outline"}>Gezocht {p.wantedLevel}/100</Badge>
          </div>
          {next && (
            <p className="text-xs text-zinc-400">
              Volgende rang {next.name} bij {next.minExp} exp
              {next.maxWorkers === 0 ? " (onbeperkte crew)." : ` (max ${next.maxWorkers} escorts).`}
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-2">
        {states.map((state, idx) => (
          <ActionFeedback key={idx} state={state} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={recruitAction}>
          <Button type="submit" disabled={busy}>
            Ronsel escort ({formatMoney(RECRUIT_COST)})
          </Button>
        </form>
        <form action={collectAction}>
          <Button type="submit" variant="secondary" disabled={busy}>
            Incasseer omzet
          </Button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="font-heading">Main escort</CardTitle>
            <CardDescription>+10% verdediging in PvP zolang zij op jouw loonlijst blijft.</CardDescription>
          </CardHeader>
          <CardContent>
            {main ? (
              <div className="flex gap-4">
                <img
                  src={main.avatar}
                  alt=""
                  className="h-44 w-32 shrink-0 rounded-lg border border-red-500/40 object-cover object-top"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-xl">{main.name}</p>
                    <Badge>Main</Badge>
                    <Badge variant="outline">{main.cityName}</Badge>
                  </div>
                  <Meter label="Loyaliteit" value={main.loyalty} barClass="bg-primary" />
                  <Meter label="Charme" value={main.charm} barClass="bg-red-500" />
                  <p className="text-xs text-muted-foreground">Buff: +10% defense · raming {formatMoney(main.hourly)}/uur</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nog geen main escort. Ronsel iemand en markeer haar als gezicht van de stal — dat bufft je pants.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Pimp-rangen</CardTitle>
            <CardDescription>Exp komt van ramen en ronselen. Razzia&apos;s vreten je dagomzet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {PIMP_RANKS.map((row) => (
              <div
                key={row.slug}
                className={cn(
                  "flex items-center justify-between rounded-md border px-2 py-1.5",
                  row.slug === rank.slug ? "border-red-500/50 bg-red-950/30" : "border-border/50",
                )}
              >
                <span>{row.name}</span>
                <span className="text-xs text-muted-foreground">
                  {row.maxWorkers === 0 ? "onbeperkt" : `max ${row.maxWorkers}`} · {row.minExp} exp
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Een speeluur is 10 minuten echte tijd. Miami betaalt het meest. Gezocht hoog = razzia-kans omhoog.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-heading mb-2 text-xl">Red Light — {p.currentCityName}</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Zes ramen in deze stad. Huur per etmaal, zet een escort uit deze stad achter het glas, wacht op de afdracht.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {windows.map((win) => (
            <Card
              key={win.slotIndex}
              className={cn(
                "overflow-hidden",
                win.status === "actief" && "border-emerald-500/40",
                win.status === "razzia" && "border-destructive/50",
                win.status === "leeg" && "border-border/60",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>Raam {win.slotIndex + 1}</span>
                  <span className="flex flex-wrap justify-end gap-1">
                    <Badge variant={win.hired && win.escort ? "default" : "secondary"}>
                      {win.hired && win.escort ? "Actief" : "Leeg"}
                    </Badge>
                    {win.status === "razzia" && <Badge variant="destructive">Razzia risico</Badge>}
                  </span>
                </CardTitle>
                <CardDescription>
                  {win.hired && win.hiredUntil
                    ? `Huur tot ${formatDateTime(win.hiredUntil)}`
                    : `Huur ${formatMoney(win.fee)} / 24u`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-0">
                <div
                  className="relative aspect-[4/3] overflow-hidden border-b border-red-500/30 bg-cover bg-center"
                  style={{ backgroundImage: "url(/game/hoeren/window.jpg)" }}
                >
                  {win.escort ? (
                    <>
                      <img
                        src={win.escort.avatar}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                      <div className="absolute inset-0 ring-2 ring-inset ring-red-500/70" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                        <p className="text-sm font-medium text-white">{win.escort.name}</p>
                        <p className="text-xs text-red-200">Achter het glas</p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-end bg-black/35 px-3 py-2">
                      <p className="text-sm text-zinc-200">Leeg — niemand op post.</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3 px-4 pb-4">
                {!win.hired && (
                  <form action={hireAction}>
                    <input type="hidden" name="slotIndex" value={win.slotIndex} />
                    <Button type="submit" size="sm" className="w-full" disabled={busy}>
                      Huur raam
                    </Button>
                  </form>
                )}

                {win.hired && win.id && !win.escort && (
                  <form action={assignAction} className="space-y-2">
                    <input type="hidden" name="windowId" value={win.id} />
                    <select
                      name="workerId"
                      required
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Kies escort in {p.currentCityName}
                      </option>
                      {localEscorts
                        .filter((row) => !row.windowId)
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name} · charme {row.charm}
                          </option>
                        ))}
                    </select>
                    <Button type="submit" size="sm" className="w-full" disabled={busy || localEscorts.filter((r) => !r.windowId).length === 0}>
                      Zet op het raam
                    </Button>
                  </form>
                )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-heading mb-2 text-xl">Crew</h2>
        {escorts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Je stalling is leeg. Ronsel iemand in {p.currentCityName} — Street Hustler mag er twee hebben.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {escorts.map((row) => (
              <Card key={row.id} className={cn(row.isMain && "border-primary/50")}>
                <CardContent className="flex gap-3 pt-4">
                  <img src={row.avatar} alt="" className="h-40 w-28 shrink-0 rounded-md object-cover object-top" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-lg">{row.name}</p>
                      {row.isMain && <Badge>Main</Badge>}
                      {row.listedPrice ? <Badge variant="outline">Te koop {formatMoney(row.listedPrice)}</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.cityName}
                      {row.windowId ? " · op een raam" : " · vrij"} · {formatMoney(row.hourly)}/uur
                    </p>
                    <Meter label="Charme" value={row.charm} barClass="bg-red-500" />
                    <Meter label="Loyaliteit" value={row.loyalty} barClass="bg-primary" />
                    <Meter label="Gezondheid" value={row.health} barClass="bg-emerald-500" />

                    <div className="flex flex-wrap gap-2 pt-1">
                      {!row.isMain && !row.listedPrice && (
                        <form action={mainAction}>
                          <input type="hidden" name="workerId" value={row.id} />
                          <Button type="submit" size="sm" variant="secondary" disabled={busy}>
                            Main escort
                          </Button>
                        </form>
                      )}
                      {row.windowId && (
                        <form action={unassignAction}>
                          <input type="hidden" name="workerId" value={row.id} />
                          <Button type="submit" size="sm" variant="outline" disabled={busy}>
                            Van het raam
                          </Button>
                        </form>
                      )}
                    </div>

                    {!row.listedPrice && (
                      <form action={transferAction} className="flex gap-2">
                        <input type="hidden" name="workerId" value={row.id} />
                        <select
                          name="targetState"
                          className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                          defaultValue={row.cityId === "mia" ? "ams" : "mia"}
                        >
                          {TRANSFER_CITIES.filter((city) => city.id !== row.cityId).map((city) => (
                            <option key={city.id} value={city.id}>
                              {city.city}
                              {city.id === "mia" ? " (hoogste payout)" : ""}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="outline" disabled={busy}>
                          Transfer
                        </Button>
                      </form>
                    )}

                    {row.listedPrice ? (
                      <form action={unlistAction}>
                        <input type="hidden" name="workerId" value={row.id} />
                        <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                          Van de beurs
                        </Button>
                      </form>
                    ) : (
                      <form action={listAction} className="flex gap-2">
                        <input type="hidden" name="workerId" value={row.id} />
                        <Input name="price" type="number" min={500} placeholder="Vraagprijs" className="h-8" />
                        <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                          Verkoop
                        </Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-heading mb-2 text-xl">Escortbeurs</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Koop crew van andere spelers. Zij landen in jouw huidige stad, zonder raam.
        </p>
        {market.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen listings. Zet zelf iemand te koop via de crew-kaart.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {market.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex gap-3 pt-4">
                  <img src={row.avatar} alt="" className="h-28 w-20 rounded object-cover object-top" />
                  <div className="flex-1 space-y-2">
                    <p className="font-heading">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.seller} · {row.cityName} · C{row.charm} L{row.loyalty} G{row.health}
                    </p>
                    <form action={buyAction}>
                      <input type="hidden" name="escortId" value={row.id} />
                      <Button type="submit" size="sm" disabled={busy}>
                        Koop {formatMoney(row.listedPrice)}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stal-log</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen beweging op straat.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {logs.map((row) => (
                <li key={row.id} className="border-b border-border/40 pb-2 last:border-0">
                  <p>{row.message}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
