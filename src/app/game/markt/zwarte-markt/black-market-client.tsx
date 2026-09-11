"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Package, Pill } from "lucide-react";
import {
  buyListing,
  cancelListing,
  cancelListings,
  createListing,
  createPriceAlert,
  deletePriceAlert,
  smuggleTrade,
  updateListing,
  updateListings,
} from "@/lib/actions/economy";
import {
  AIRPORTS,
  SMUGGLE_GOODS,
  cityDisplayName,
  goodStock,
  smugglePrice,
  spreadPct,
  vsAmsterdamPct,
  type SmuggleGood,
} from "@/lib/airports";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  cityTip,
  listingLabel,
  listingTypeForGood,
  unitAsk,
  type ListingDTO,
  type PriceAlertDTO,
  type TradeLogDTO,
} from "@/lib/market";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QtyShortcuts } from "@/components/game/qty-shortcuts";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import type { ActionResult, PlayerSnapshot } from "@/types/game";
import { cn } from "@/lib/utils";

const ICONS: Record<SmuggleGood, typeof Pill> = {
  drugs: Pill,
  weapons: Package,
  bullets: Crosshair,
};

type SortKey = "newest" | "price" | "qty";

export function BlackMarketClient({
  initialPlayer,
  listings,
  mine,
  history,
  logs,
  alerts,
}: {
  initialPlayer: PlayerSnapshot;
  listings: ListingDTO[];
  mine: ListingDTO[];
  history: ListingDTO[];
  logs: TradeLogDTO[];
  alerts: PriceAlertDTO[];
}) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending } = useGameAction();
  const router = useRouter();
  const refresh = (r: ActionResult) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-xl border border-[#d4a359]/30 bg-[#1a1510]">
        <div className="h-12 bg-gradient-to-r from-[#8b2626]/40 via-[#1a1510] to-[#d4a359]/25" />
        <div className="px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4a359]/80">Ondergronds</p>
          <h1 className="font-heading text-3xl text-[#d4a359]">Zwarte Markt</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Handel in {p.currentCityName}. Straatprijzen, spelersorders en alerts — Amsterdam is de basis.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge className="bg-[#d4a359]/20 text-[#d4a359]">{p.currentCityName}</Badge>
            <Badge variant="outline">{p.drugs} drugs</Badge>
            <Badge variant="outline">{p.weaponCrates} kisten</Badge>
            <Badge variant="outline">{p.bullets} kogels</Badge>
            <Badge variant="outline">{formatMoney(p.cash)} cash</Badge>
          </div>
          {p.isTraveling && (
            <p className="mt-2 text-sm text-destructive">In de lucht: kopen, verkopen en plaatsen zijn gesloten.</p>
          )}
        </div>
      </header>

      <Tabs defaultValue="handel">
        <TabsList>
          <TabsTrigger value="handel">Handel</TabsTrigger>
          <TabsTrigger value="mijn">Mijn advertenties</TabsTrigger>
          <TabsTrigger value="geschiedenis">Mijn handelsgeschiedenis</TabsTrigger>
          <TabsTrigger value="alerts">Prijsalerts</TabsTrigger>
        </TabsList>

        <TabsContent value="handel" className="mt-4 space-y-5">
          <QuickTrade player={p} pending={pending} traveling={p.isTraveling} onDone={refresh} run={run} />
          <ListingsTable
            userId={p.id}
            listings={listings}
            pending={pending}
            traveling={p.isTraveling}
            onBuy={(id) => run(() => buyListing(id), refresh)}
            onCancel={(id) => run(() => cancelListing(id), refresh)}
          />
        </TabsContent>

        <TabsContent value="mijn" className="mt-4">
          <MineTable
            mine={mine}
            pending={pending}
            traveling={p.isTraveling}
            run={run}
            onDone={refresh}
          />
        </TabsContent>

        <TabsContent value="geschiedenis" className="mt-4 space-y-4">
          <HistoryPanel userId={p.id} history={history} logs={logs} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertsPanel
            cityId={p.currentCity}
            alerts={alerts}
            pending={pending}
            run={run}
            onDone={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuickTrade({
  player,
  pending,
  traveling,
  onDone,
  run,
}: {
  player: PlayerSnapshot;
  pending: boolean;
  traveling: boolean;
  onDone: (r: ActionResult) => void;
  run: (action: () => Promise<ActionResult>, onDone?: (r: ActionResult) => void) => void;
}) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [mode, setMode] = useState<"spot" | "order">("spot");
  const [qty, setQty] = useState<Record<SmuggleGood, number>>({ drugs: 1, weapons: 1, bullets: 1 });
  const [ask, setAsk] = useState<Record<SmuggleGood, number>>({
    drugs: smugglePrice(player.currentCity, "drugs", "sell"),
    weapons: smugglePrice(player.currentCity, "weapons", "sell"),
    bullets: smugglePrice(player.currentCity, "bullets", "sell"),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={side} onValueChange={(value) => setSide(value as "buy" | "sell")}>
          <TabsList>
            <TabsTrigger value="buy">Kopen</TabsTrigger>
            <TabsTrigger value="sell">Verkopen</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={mode} onValueChange={(value) => setMode(value as "spot" | "order")}>
          <TabsList>
            <TabsTrigger value="spot">Direct (straat)</TabsTrigger>
            <TabsTrigger value="order">Order plaatsen</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {SMUGGLE_GOODS.map((good) => {
          const Icon = ICONS[good.id];
          const buy = smugglePrice(player.currentCity, good.id, "buy");
          const sell = smugglePrice(player.currentCity, good.id, "sell");
          const unit = mode === "order" ? Math.max(1, ask[good.id] || 1) : side === "buy" ? buy : sell;
          const have = goodStock(player, good.id);
          const maxBuy = Math.min(200, Math.floor(player.cash / Math.max(1, unit)));
          const maxSell = Math.min(200, have);
          const max = side === "buy" && mode === "spot" ? Math.max(1, maxBuy) : side === "sell" ? Math.max(1, maxSell) : Math.max(1, maxBuy);
          const n = Math.min(max, Math.max(1, qty[good.id] || 1));
          const total = n * unit;
          const tip = cityTip(good.id, player.currentCity);
          const trend = vsAmsterdamPct(player.currentCity, good.id, "buy");
          const disabled =
            pending ||
            traveling ||
            (side === "sell" && have < n) ||
            (mode === "spot" && side === "buy" && player.cash < total) ||
            (mode === "order" && side === "buy");
          return (
            <Card key={good.id} className="border-[#d4a359]/30 bg-[#1a1510]">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2 text-[#d4a359]">
                  <Icon className="size-4" />
                  {good.label}
                </CardTitle>
                <CardDescription>{good.hint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  Straat koop {formatMoney(buy)} · verkoop {formatMoney(sell)}
                </p>
                <p className="text-xs">
                  Spread {spreadPct(buy, sell)}% · vs Amsterdam{" "}
                  <span className={trend > 0 ? "text-destructive" : "text-emerald-400"}>
                    {trend > 0 ? "+" : ""}
                    {trend}%
                  </span>
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge className={cn("text-[10px]", tip.hereCheap ? "bg-emerald-900/60 text-emerald-200" : "bg-[#d4a359]/15 text-[#d4a359]")}>
                    {tip.cheapLabel}
                  </Badge>
                  <Badge className={cn("text-[10px]", tip.hereDear ? "bg-red-950 text-red-200" : "bg-muted text-muted-foreground")}>
                    {tip.dearLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Voorraad: {have}</p>
                {mode === "order" && side === "sell" && (
                  <label className="block text-xs text-muted-foreground">
                    Ask per stuk
                    <Input
                      type="number"
                      min={1}
                      value={ask[good.id]}
                      onChange={(e) => setAsk((s) => ({ ...s, [good.id]: Number(e.target.value) || 1 }))}
                      className="mt-1"
                    />
                  </label>
                )}
                {mode === "order" && side === "buy" && (
                  <p className="text-xs text-muted-foreground">
                    Kopen van spelers doe je in de tabel hieronder. Direct kopen: kies Direct (straat).
                  </p>
                )}
                <QtyShortcuts
                  max={max}
                  disabled={pending || traveling || (side === "sell" && have < 1)}
                  onPick={(value) => setQty((s) => ({ ...s, [good.id]: value }))}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={max}
                    value={n}
                    onChange={(e) => setQty((s) => ({ ...s, [good.id]: Number(e.target.value) || 1 }))}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    {n} × {formatMoney(unit)} ={" "}
                    <span className="font-medium text-[#d4a359]">{formatMoney(total)}</span>
                  </p>
                </div>
                <Button
                  disabled={disabled || (mode === "order" && side === "buy")}
                  className="bg-[#d4a359] text-[#1a1510] hover:bg-[#d4a359]/85"
                  onClick={() => {
                    if (mode === "spot") {
                      run(() => smuggleTrade(good.id, side, n), onDone);
                      return;
                    }
                    run(
                      () =>
                        createListing({
                          type: listingTypeForGood(good.id),
                          quantity: n,
                          price: total,
                          unitPrice: unit,
                        }),
                      onDone,
                    );
                  }}
                >
                  {mode === "spot"
                    ? side === "buy"
                      ? "Bevestig koop"
                      : "Bevestig verkoop"
                    : "Plaats order"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ListingsTable({
  userId,
  listings,
  pending,
  traveling,
  onBuy,
  onCancel,
}: {
  userId: string;
  listings: ListingDTO[];
  pending: boolean;
  traveling: boolean;
  onBuy: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("newest");
  const [filter, setFilter] = useState<"all" | SmuggleGood>("all");
  const rows = useMemo(() => {
    const filtered =
      filter === "all"
        ? listings
        : listings.filter((row) => listingTypeForGood(filter) === row.type);
    return [...filtered].sort((a, b) => {
      if (sort === "qty") return b.quantity - a.quantity;
      if (sort === "price") return unitAsk(a.price, a.quantity) - unitAsk(b.price, b.quantity);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filter, listings, sort]);

  return (
    <Card className="border-[#d4a359]/25 bg-[#14110d]">
      <CardHeader>
        <CardTitle className="font-heading text-[#d4a359]">Actieve advertenties</CardTitle>
        <CardDescription>Item, aantal, ask per stuk en totaal. Koop van andere spelers of trek je eigen order in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "drugs", "weapons", "bullets"] as const).map((key) => (
            <Button
              key={key}
              size="xs"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? "Alles" : SMUGGLE_GOODS.find((g) => g.id === key)?.label}
            </Button>
          ))}
          <span className="mx-1 text-xs text-muted-foreground self-center">Sorteer</span>
          {([
            ["newest", "Nieuwste"],
            ["price", "Prijs"],
            ["qty", "Aantal"],
          ] as const).map(([key, label]) => (
            <Button key={key} size="xs" variant={sort === key ? "default" : "outline"} onClick={() => setSort(key)}>
              {label}
            </Button>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d4a359]/30 px-6 py-12 text-center">
            <p className="font-heading text-xl text-[#d4a359]">Nog geen orders op de vloer</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Plaats een verkooporder of koop direct van de straatdealer hierboven.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Aantal</TableHead>
                <TableHead>Ask/stuk</TableHead>
                <TableHead>Totaal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p>{listingLabel(row.type, row.quantity)}</p>
                    <p className="text-xs text-muted-foreground">{row.sellerName}</p>
                  </TableCell>
                  <TableCell className="tabular-nums">{row.quantity}</TableCell>
                  <TableCell className="tabular-nums">{formatMoney(unitAsk(row.price, row.quantity))}</TableCell>
                  <TableCell className="tabular-nums">{formatMoney(row.price)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Live</Badge>
                  </TableCell>
                  <TableCell>
                    {row.sellerId === userId ? (
                      <Button size="xs" variant="outline" disabled={pending} onClick={() => onCancel(row.id)}>
                        Intrekken
                      </Button>
                    ) : (
                      <Button size="xs" disabled={pending || traveling} onClick={() => onBuy(row.id)}>
                        Kopen
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MineTable({
  mine,
  pending,
  traveling,
  run,
  onDone,
}: {
  mine: ListingDTO[];
  pending: boolean;
  traveling: boolean;
  run: (
    action: () => Promise<ActionResult>,
    onDone?: (r: ActionResult) => void,
  ) => void;
  onDone: (r: ActionResult) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAsk, setBulkAsk] = useState("10");
  const [edits, setEdits] = useState<Record<string, string>>({});

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  if (mine.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#d4a359]/30 bg-[#1a1510] px-6 py-12 text-center">
        <p className="font-heading text-xl text-[#d4a359]">Geen actieve advertenties</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Zet drugs, kisten of kogels te koop via Handel → Order plaatsen.
        </p>
      </div>
    );
  }

  return (
    <Card className="border-[#d4a359]/25 bg-[#1a1510]">
      <CardHeader>
        <CardTitle className="font-heading text-[#d4a359]">Jouw orders</CardTitle>
        <CardDescription>Selecteer meerdere om in één keer in te trekken of de ask bij te werken.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => setSelected(mine.map((row) => row.id))}>
            Alles
          </Button>
          <Button size="xs" variant="outline" onClick={() => setSelected([])}>
            Niets
          </Button>
          <Button
            size="xs"
            variant="destructive"
            disabled={pending || selected.length === 0}
            onClick={() => run(() => cancelListings(selected), onDone)}
          >
            Intrekken ({selected.length})
          </Button>
          <Input
            type="number"
            min={1}
            value={bulkAsk}
            onChange={(e) => setBulkAsk(e.target.value)}
            className="w-28"
            placeholder="Ask/stuk"
          />
          <Button
            size="xs"
            disabled={pending || traveling || selected.length === 0}
            onClick={() => run(() => updateListings(selected, Number(bulkAsk)), onDone)}
          >
            Ask bijwerken
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Aantal</TableHead>
              <TableHead>Ask/stuk</TableHead>
              <TableHead>Totaal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mine.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label="Selecteer advertentie"
                  />
                </TableCell>
                <TableCell>{listingLabel(row.type, row.quantity)}</TableCell>
                <TableCell className="tabular-nums">{row.quantity}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      className="h-7 w-24"
                      value={edits[row.id] ?? String(unitAsk(row.price, row.quantity))}
                      onChange={(e) => setEdits((s) => ({ ...s, [row.id]: e.target.value }))}
                    />
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={pending || traveling}
                      onClick={() =>
                        run(() => updateListing(row.id, Number(edits[row.id] ?? unitAsk(row.price, row.quantity))), onDone)
                      }
                    >
                      Opslaan
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{formatMoney(row.price)}</TableCell>
                <TableCell>
                  <Badge variant="outline">Live</Badge>
                </TableCell>
                <TableCell>
                  <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => cancelListing(row.id), onDone)}>
                    Intrekken
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function HistoryPanel({
  userId,
  history,
  logs,
}: {
  userId: string;
  history: ListingDTO[];
  logs: TradeLogDTO[];
}) {
  return (
    <>
      <Card className="border-[#d4a359]/25 bg-[#1a1510]">
        <CardHeader>
          <CardTitle className="font-heading text-[#d4a359]">Afgeronde orders</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nog geen afgeronde handel.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Aantal</TableHead>
                  <TableHead>Ask/stuk</TableHead>
                  <TableHead>Totaal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Wanneer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => {
                  const sold = Boolean(row.buyerId);
                  const status = sold
                    ? row.sellerId === userId
                      ? `Verkocht aan ${row.buyerName}`
                      : `Gekocht van ${row.sellerName}`
                    : "Ingetrokken";
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{listingLabel(row.type, row.quantity, row.itemName ?? row.vehicleName)}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{formatMoney(unitAsk(row.price, row.quantity))}</TableCell>
                      <TableCell>{formatMoney(row.price)}</TableCell>
                      <TableCell>{status}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(row.completedAt ?? row.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Logboek (handel & alerts)</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen regels.</p>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {logs.map((row) => (
                <li key={row.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{row.message}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AlertsPanel({
  cityId,
  alerts,
  pending,
  run,
  onDone,
}: {
  cityId: string;
  alerts: PriceAlertDTO[];
  pending: boolean;
  run: (
    action: () => Promise<ActionResult>,
    onDone?: (r: ActionResult) => void,
  ) => void;
  onDone: (r: ActionResult) => void;
}) {
  const [good, setGood] = useState<SmuggleGood>("drugs");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [threshold, setThreshold] = useState(String(smugglePrice(cityId, "drugs", "buy")));
  const [watch, setWatch] = useState("here");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-[#d4a359]/25 bg-[#1a1510]">
        <CardHeader>
          <CardTitle className="font-heading text-[#d4a359]">Nieuwe alert</CardTitle>
          <CardDescription>
            Melding in je logboek wanneer de straatprijs in een stad de drempel kruist (bij landing of meteen als het
            hier al klopt).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SMUGGLE_GOODS.map((row) => (
              <Button key={row.id} size="xs" variant={good === row.id ? "default" : "outline"} onClick={() => setGood(row.id)}>
                {row.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="xs" variant={side === "buy" ? "default" : "outline"} onClick={() => setSide("buy")}>
              Koopprijs ≤
            </Button>
            <Button size="xs" variant={side === "sell" ? "default" : "outline"} onClick={() => setSide("sell")}>
              Verkoopprijs ≥
            </Button>
          </div>
          <Input type="number" min={1} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
            value={watch}
            onChange={(e) => setWatch(e.target.value)}
          >
            <option value="here">Alleen huidige stad</option>
            <option value="">Elke stad</option>
            {AIRPORTS.map((row) => (
              <option key={row.id} value={row.id}>
                {row.city}
              </option>
            ))}
          </select>
          <Button
            disabled={pending}
            className="bg-[#d4a359] text-[#1a1510] hover:bg-[#d4a359]/85"
            onClick={() =>
              run(
                () =>
                  createPriceAlert({
                    good,
                    side,
                    threshold: Number(threshold),
                    cityId: watch,
                  }),
                onDone,
              )
            }
          >
            Alert zetten
          </Button>
        </CardContent>
      </Card>
      <Card className="border-[#d4a359]/25 bg-[#1a1510]">
        <CardHeader>
          <CardTitle className="font-heading text-[#d4a359]">Actieve alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nog geen alerts. Zet er één zodat je de bodem niet mist.</p>
          ) : (
            alerts.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <div>
                  <p>
                    {SMUGGLE_GOODS.find((g) => g.id === row.good)?.label} ·{" "}
                    {row.side === "sell" ? "verkoop ≥" : "koop ≤"} {formatMoney(row.threshold)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.cityId ? cityDisplayName(row.cityId) : "Elke stad"}
                    {row.lastFiredAt
                      ? ` · laatst ${formatDateTime(row.lastFiredAt)}${row.lastFiredCity ? ` in ${cityDisplayName(row.lastFiredCity)}` : ""}`
                      : " · nog niet afgegaan"}
                  </p>
                </div>
                <Button size="xs" variant="outline" disabled={pending} onClick={() => run(() => deletePriceAlert(row.id), onDone)}>
                  Weg
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
