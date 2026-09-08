"use client";

import {
  assignToWindowForm,
  buyListedEscortForm,
  collectPimpIncomeForm,
  hireWindowForm,
  listEscortForm,
  recruitEscortForm,
  sellEscortToNpcForm,
  sendDrugRunForm,
  setMainEscortForm,
  startDarkRoomForm,
  transferToStateForm,
  unassignFromWindowForm,
  unlistEscortForm,
} from "@/lib/actions/pimp";
import {
  claimStreetZoneForm,
  recruitStreetForm,
  recruitStripclubForm,
  setEscortVenueForm,
  spendBlackmailForm,
  startVipJobForm,
  treatOutbreakForm,
} from "@/lib/actions/empire";
import {
  DARK_ROOMS,
  DRUG_RUN,
  PIMP_RANKS,
  RECRUIT_COST,
  TRANSFER_CITIES,
  durationLabelNl,
  pimpRankProgress,
} from "@/lib/pimp";
import {
  BLACKMAIL_WANTED_DROP,
  OUTBREAK_CLINIC_FEE,
  STREET_RECRUIT_COST,
  STRIP_RECRUIT_COST,
  VENUES,
  VIP_JOBS,
} from "@/lib/empire";
import { hoerenArt } from "@/lib/game-art";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CardArt } from "@/components/game/card-art";
import { Countdown } from "@/components/game/countdown";
import { usePlayer } from "@/hooks/use-player";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import type { PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { EscortDTO, MarketEscortDTO, StreetZoneDTO, WindowDTO } from "./types";

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

function freeEscorts(escorts: EscortDTO[]) {
  return escorts.filter((row) => !row.listedPrice && !row.windowId && !row.busy);
}

export function HoerenClient({
  initialPlayer,
  escorts,
  windows,
  market,
  zones,
  logs,
}: {
  initialPlayer: PlayerSnapshot;
  escorts: EscortDTO[];
  windows: WindowDTO[];
  market: MarketEscortDTO[];
  zones: StreetZoneDTO[];
  logs: { id: string; message: string; createdAt: string }[];
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const router = useRouter();
  const progress = pimpRankProgress(p.pimpExp);
  const rank = progress.current;
  const next = progress.next;
  const cap = rank.maxWorkers === 0 ? "onbeperkt" : String(rank.maxWorkers);
  const main = escorts.find((row) => row.id === p.mainEscortId) ?? escorts.find((row) => row.isMain) ?? null;
  const localEscorts = escorts.filter((row) => row.cityId === p.currentCity && !row.listedPrice);
  const idleLocal = freeEscorts(localEscorts);
  const idleAny = freeEscorts(escorts);

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
  const [sellState, sellAction, selling] = useFormAction(sellEscortToNpcForm);
  const [drugState, drugAction, sendingDrug] = useFormAction(sendDrugRunForm);
  const [darkState, darkAction, bookingDark] = useFormAction(startDarkRoomForm);
  const [streetRecruitState, streetRecruitAction, recruitingStreet] = useFormAction(recruitStreetForm);
  const [stripRecruitState, stripRecruitAction, recruitingStrip] = useFormAction(recruitStripclubForm);
  const [venueState, venueAction, settingVenue] = useFormAction(setEscortVenueForm);
  const [vipState, vipAction, bookingVip] = useFormAction(startVipJobForm);
  const [zoneState, zoneAction, claimingZone] = useFormAction(claimStreetZoneForm);
  const [tapeState, tapeAction, spendingTape] = useFormAction(spendBlackmailForm);
  const [clinicState, clinicAction, treating] = useFormAction(treatOutbreakForm);

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
    sellState,
    drugState,
    darkState,
    streetRecruitState,
    stripRecruitState,
    venueState,
    vipState,
    zoneState,
    tapeState,
    clinicState,
  ];

  useEffect(() => {
    if (states.some((row) => row?.ok)) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
    sellState,
    drugState,
    darkState,
    streetRecruitState,
    stripRecruitState,
    venueState,
    vipState,
    zoneState,
    tapeState,
    clinicState,
  ]);

  useEffect(() => {
    const timers = escorts
      .filter((row) => row.busyUntil)
      .map((row) => {
        const ms = new Date(row.busyUntil!).getTime() - Date.now() + 500;
        if (ms <= 0) {
          router.refresh();
          return null;
        }
        return setTimeout(() => router.refresh(), ms);
      });
    return () => {
      for (const timer of timers) if (timer) clearTimeout(timer);
    };
  }, [escorts, router]);

  const busy =
    recruiting ||
    hiring ||
    assigning ||
    unassigning ||
    transferring ||
    settingMain ||
    listing ||
    unlisting ||
    buying ||
    collecting ||
    selling ||
    sendingDrug ||
    bookingDark ||
    recruitingStreet ||
    recruitingStrip ||
    settingVenue ||
    bookingVip ||
    claimingZone ||
    spendingTape ||
    treating;
  const razziaCity = p.wantedLevel >= 40;
  const outbreakActive = !!(p.outbreakUntil && new Date(p.outbreakUntil).getTime() > Date.now());
  const streetCover = !!(p.streetProtectUntil && new Date(p.streetProtectUntil).getTime() > Date.now());
  const vipReady = idleAny.filter((row) => row.health >= 28);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-red-500/30">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${hoerenArt("header")})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
        <div className="relative space-y-3 px-5 py-8 md:px-8">
          <p className="text-[11px] tracking-[0.25em] text-red-300 uppercase">
            Dark Red Light Empire · {p.currentCityName}
          </p>
          <h1 className="font-heading text-3xl text-white md:text-4xl">Hoeren</h1>
          <p className="max-w-xl text-sm text-zinc-200">
            Stoep, stripclub, cams en BDSM-club — volwassen, vrijwillig, 21+. Geen slavernijmeters, geen vleesmarkt.
            VIP-gasten kunnen USB-kompromat achterlaten. Rivalen (De Roos, Uncle Vito, Madame K) vechten om je hoeken.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-red-700 text-white">{rank.name}</Badge>
            <Badge variant="secondary">
              Crew {p.workerCount}/{cap}
            </Badge>
            <Badge variant="outline">Pimp-exp {p.pimpExp}</Badge>
            <Badge variant="outline">Kompromat {p.blackmailTapes}</Badge>
            <Badge variant="outline">Drugs {p.drugs}</Badge>
            <Badge variant={razziaCity ? "destructive" : "outline"}>Gezocht {p.wantedLevel}/100</Badge>
            {streetCover && <Badge className="bg-emerald-800 text-white">Stoepdekking</Badge>}
            {outbreakActive && <Badge variant="destructive">Uitbraak</Badge>}
          </div>
          <div className="max-w-md">
            <Meter label={`Rang ${progress.label}`} value={progress.value} barClass="bg-red-400" />
            {next ? (
              <p className="mt-1 text-xs text-zinc-400">
                Volgende rang {next.name}
                {next.maxWorkers === 0 ? " (onbeperkte crew)." : ` (max ${next.maxWorkers} escorts).`}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-400">Ghetto Mogul — geen crewplafond.</p>
            )}
          </div>
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
        <form action={streetRecruitAction}>
          <Button type="submit" variant="secondary" disabled={busy}>
            Straat-ronselen ({formatMoney(STREET_RECRUIT_COST)})
          </Button>
        </form>
        <form action={stripRecruitAction}>
          <Button type="submit" variant="secondary" disabled={busy}>
            Stripclub-ronselen ({formatMoney(STRIP_RECRUIT_COST)})
          </Button>
        </form>
        <form action={collectAction}>
          <Button type="submit" variant="outline" disabled={busy}>
            Incasseer omzet
          </Button>
        </form>
      </div>

      {outbreakActive && (
        <Card className="border-amber-500/50 bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Uitbraak in de stalling</CardTitle>
            <CardDescription>
              Omzet −35% tot de testdag klaar is. Geen marteling — een ziekte-event. Privékliniek {formatMoney(OUTBREAK_CLINIC_FEE)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            {p.outbreakUntil && <Countdown until={p.outbreakUntil} label="Actief tot:" />}
            <form action={clinicAction}>
              <Button type="submit" size="sm" disabled={busy}>
                Kliniek {formatMoney(OUTBREAK_CLINIC_FEE)}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="font-heading">Main escort</CardTitle>
            <CardDescription>+10% verdediging in PvP zolang zij op jouw loonlijst blijft.</CardDescription>
          </CardHeader>
          <CardContent>
            {main ? (
              <div className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    <Badge variant="outline">{main.venueName}</Badge>
                    {main.busy && <Badge variant="secondary">{main.missionLabel}</Badge>}
                  </div>
                  <Meter label="Loyaliteit" value={main.loyalty} barClass="bg-primary" />
                  <Meter label="Charme" value={main.charm} barClass="bg-red-500" />
                  <p className="text-xs text-muted-foreground">
                    Buff: +10% defense · raming {formatMoney(main.hourly)}/uur
                  </p>
                  {main.busyUntil && <Countdown until={main.busyUntil} label="Terug:" />}
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
            <CardDescription>
              Exp van ramen, Dark Room, drugruns, transfers en verkopen. Razzia&apos;s vreten raam-omzet.
            </CardDescription>
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
              Een speeluur is 10 minuten echte tijd. Miami betaalt het meest. Street-hoek, VIP en cams tellen mee voor
              pimp-exp. Dark Room blijft clubwerk, geen kelder.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-heading mb-2 text-xl">Zaken</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Vier consensuele businesslijnen. Live cams verdienen ook zonder raam. Zet per escort de zaak via haar
          crewkaart. Zij mag de boeking weigeren.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {VENUES.map((venue) => (
            <Card key={venue.key} className="overflow-hidden border-red-500/20">
              <CardArt src={venue.image} alt={venue.name} />
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{venue.name}</CardTitle>
                <CardDescription>{venue.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Uur-multiplier ×{venue.payoutMult.toString().replace(".", ",")}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-heading mb-2 text-xl">Straatterrein — {p.currentCityName}</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Drie hoeken. NPC-pimps houden ze vast tot jij overneemt. Risico: klap van de rival (gezondheid), zedenpolitie
          (gezocht), takeover als je dekking verliest. Cash + pimp-exp per speeluur.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {zones.map((zone) => (
            <Card
              key={zone.id}
              className={cn(zone.mine ? "border-emerald-500/40" : "border-red-500/25")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{zone.name}</span>
                  {zone.mine ? <Badge>Jouw hoek</Badge> : <Badge variant="secondary">{zone.rivalName}</Badge>}
                </CardTitle>
                <CardDescription>
                  Heat {zone.heat} · overname {formatMoney(zone.fee)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Countdown until={zone.claimedUntil} label={zone.mine ? "Claim tot:" : "Vrij na:"} />
                {streetCover && zone.mine && (
                  <p className="text-xs text-emerald-400">Wethouder-dekking actief op deze stoep.</p>
                )}
                <form action={zoneAction}>
                  <input type="hidden" name="slotIndex" value={zone.slotIndex} />
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full"
                    disabled={
                      busy ||
                      zone.mine ||
                      (!!zone.ownerId && !zone.mine && new Date(zone.claimedUntil).getTime() > Date.now())
                    }
                  >
                    {zone.mine
                      ? "Al van jou"
                      : zone.ownerId && new Date(zone.claimedUntil).getTime() > Date.now()
                        ? "Andere speler"
                        : `Neem over van ${zone.rivalName}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-heading mb-2 text-xl">VIP / high-roller</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Gasten met te veel geld. Kompromat zit op de corrupte gast, nooit op je crew. Zij mag nee zeggen. Conditie
          28+.
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {VIP_JOBS.map((job) => (
            <Card key={job.key} className="overflow-hidden border-fuchsia-500/25">
              <CardArt src={job.image} alt={job.name} />
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{job.name}</CardTitle>
                <CardDescription>{job.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {durationLabelNl(job.durationMs)} · basis {formatMoney(job.cashBase)} · +{job.pimpExp} exp ·
                  USB-kans {job.blackmailChance}% · zeden {job.wantedChance}% · uitbraak {job.outbreakChance}%
                </p>
                <form action={vipAction} className="space-y-2">
                  <input type="hidden" name="jobKey" value={job.key} />
                  <select
                    name="workerId"
                    required
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Kies vrije escort (G28+)
                    </option>
                    {vipReady.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.venueName} · G{row.health}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" className="w-full" disabled={busy || vipReady.length === 0}>
                    Stuur op VIP
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="font-heading">Kompromat</CardTitle>
          <CardDescription>
            USB van een high-roller of wethouder. Sextortion op hém: gezocht −{BLACKMAIL_WANTED_DROP}, cash, of 30 min
            stoepdekking. Niet op je crew.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <form action={tapeAction}>
            <input type="hidden" name="mode" value="wanted" />
            <Button type="submit" size="sm" variant="secondary" disabled={busy || p.blackmailTapes < 1}>
              Koop zeden af
            </Button>
          </form>
          <form action={tapeAction}>
            <input type="hidden" name="mode" value="cash" />
            <Button type="submit" size="sm" variant="secondary" disabled={busy || p.blackmailTapes < 1}>
              Verkoop de tape
            </Button>
          </form>
          <form action={tapeAction}>
            <input type="hidden" name="mode" value="protect" />
            <Button type="submit" size="sm" variant="secondary" disabled={busy || p.blackmailTapes < 1}>
              Stoepdekking
            </Button>
          </form>
          {streetCover && p.streetProtectUntil && (
            <Countdown until={p.streetProtectUntil} label="Dekking tot:" />
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="font-heading mb-2 text-xl">Red Light — {p.currentCityName}</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Zes ramen in deze stad. Huur per etmaal, zet een vrije escort uit deze stad achter het glas. Niet tegelijk
          met Dark Room of een drugrun.
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
                  style={{ backgroundImage: `url(${hoerenArt("window")})` }}
                >
                  {win.escort ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          Kies vrije escort in {p.currentCityName}
                        </option>
                        {idleLocal.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name} · charme {row.charm}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" className="w-full" disabled={busy || idleLocal.length === 0}>
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
        <h2 className="font-heading mb-2 text-xl">Dark Room</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Premium clubboekingen naast het raam. Consensueel, 21+, met huisregels. Geen dwang, geen kelder. Kies een
          programma en een vrije escort — niet tegelijk achter glas.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DARK_ROOMS.map((room) => (
            <Card key={room.key} className="overflow-hidden border-fuchsia-500/25">
              <CardArt src={room.image} alt={room.name} />
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{room.name}</CardTitle>
                <CardDescription>{room.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {durationLabelNl(room.durationMs)} · basis {formatMoney(room.cashBase)} · +{room.pimpExp} exp ·
                  loyaliteit {room.loyaltyDelta > 0 ? "+" : ""}
                  {room.loyaltyDelta} · conditie {room.healthDelta} · razzia-kans {room.wantedChance}%
                </p>
                <form action={darkAction} className="space-y-2">
                  <input type="hidden" name="roomKey" value={room.key} />
                  <select
                    name="workerId"
                    required
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Kies vrije escort
                    </option>
                    {idleAny.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.cityName} · G{row.health}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" className="w-full" disabled={busy || idleAny.length === 0}>
                    Boek Dark Room
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden border-amber-500/25">
          <CardArt src={DRUG_RUN.image} alt={DRUG_RUN.name} />
          <CardHeader>
            <CardTitle className="font-heading">{DRUG_RUN.name}</CardTitle>
            <CardDescription>{DRUG_RUN.blurb}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Duur {durationLabelNl(DRUG_RUN.durationMs)}. Succes: drugs + cash + pimp-exp. Mislukt: gezocht of 2 min
              cel voor jou. Niet tegelijk op een raam of in de Dark Room.
            </p>
            <form action={drugAction} className="space-y-2">
              <select
                name="workerId"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Kies vrije escort (conditie 30+)
                </option>
                {idleAny
                  .filter((row) => row.health >= 30)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} · {row.cityName} · G{row.health}
                    </option>
                  ))}
              </select>
              <Button type="submit" size="sm" disabled={busy || idleAny.filter((row) => row.health >= 30).length === 0}>
                Stuur op pad
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-emerald-500/20">
          <CardArt src={hoerenArt("handel")} alt="Contractoverdracht" />
          <CardHeader>
            <CardTitle className="font-heading">Vrouwenhandel — contracten</CardTitle>
            <CardDescription>
              Geen ontvoering. Een NPC-club koopt een contract over: instant cash, zij verdwijnt van je loonlijst,
              jij krijgt pimp-exp. Of zet haar op de escortbeurs voor andere spelers. Transfer naar Miami voor hogere
              uurprijs.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              NPC-bod staat op elke crewkaart. Beurs = speler-tot-speler. Export via transfer hergebruikt de
              vliegveld-steden.
            </p>
          </CardContent>
        </Card>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.avatar} alt="" className="h-40 w-28 shrink-0 rounded-md object-cover object-top" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-lg">{row.name}</p>
                      {row.isMain && <Badge>Main</Badge>}
                      {row.listedPrice ? <Badge variant="outline">Te koop {formatMoney(row.listedPrice)}</Badge> : null}
                      {row.busy && <Badge variant="secondary">{row.missionLabel}</Badge>}
                      <Badge variant="outline">{row.venueName}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.cityName}
                      {row.windowId ? " · op een raam" : row.busy ? " · onderweg" : " · vrij"} ·{" "}
                      {formatMoney(row.hourly)}/uur
                    </p>
                    {row.busyUntil && <Countdown until={row.busyUntil} label="Klaar:" />}
                    <Meter label="Charme" value={row.charm} barClass="bg-red-500" />
                    <Meter label="Loyaliteit" value={row.loyalty} barClass="bg-primary" />
                    <Meter label="Gezondheid" value={row.health} barClass="bg-emerald-500" />

                    {!row.listedPrice && !row.busy && (
                      <form action={venueAction} className="flex gap-2">
                        <input type="hidden" name="workerId" value={row.id} />
                        <select
                          name="venueKind"
                          className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                          defaultValue={row.venueKind}
                        >
                          {VENUES.map((venue) => (
                            <option key={venue.key} value={venue.key}>
                              {venue.name}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="outline" disabled={busy}>
                          Zaak
                        </Button>
                      </form>
                    )}

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

                    {!row.listedPrice && !row.busy && (
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
                    ) : row.busy ? null : (
                      <form action={listAction} className="flex gap-2">
                        <input type="hidden" name="workerId" value={row.id} />
                        <Input name="price" type="number" min={500} placeholder="Vraagprijs" className="h-8" />
                        <Button type="submit" size="sm" variant="ghost" disabled={busy}>
                          Beurs
                        </Button>
                      </form>
                    )}

                    {!row.listedPrice && !row.busy && !row.windowId && (
                      <form action={sellAction}>
                        <input type="hidden" name="workerId" value={row.id} />
                        <Button type="submit" size="sm" variant="destructive" disabled={busy}>
                          NPC-club {formatMoney(row.npcPrice)}
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
          Speler-tot-speler contracten. Zij landen in jouw huidige stad, zonder raam.
        </p>
        {market.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen listings. Zet zelf iemand te koop via de crew-kaart.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {market.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex gap-3 pt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
