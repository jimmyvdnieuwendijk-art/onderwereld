"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Landmark,
  LayoutDashboard,
  Building2,
  Sparkles,
  Skull,
  Settings,
  Users,
  Crown,
} from "lucide-react";
import {
  acceptFamilyInvite,
  buyFamilyBuilding,
  buyFamilyUpgrade,
  claimHeistSeat,
  createFamily,
  declineFamilyInvite,
  disbandFamily,
  donateToFamily,
  inviteToFamily,
  kickFamilyMember,
  leaveFamily,
  openFamilyHeist,
  pinFamilyAnnouncement,
  payoutFromFamily,
  raidRivalFamily,
  runFamilyHeist,
  setFamilyMemberRole,
  transferDon,
  updateFamilyMotto,
} from "@/lib/actions/family";
import { FAMILY_ANNOUNCE_MAX, FAMILY_CREATE_COST } from "@/lib/constants";
import {
  canInviteKick,
  canLeadJobs,
  canManageFamily,
  FAMILY_BUILDINGS,
  FAMILY_HEISTS,
  FAMILY_ROLE_RIGHTS,
  FAMILY_UPGRADES,
  familyExpToNext,
  familyHeistDef,
  familyLevel,
  familyRoleLabel,
  familyRoleRank,
  nextMemberLimit,
  normalizeFamilyRole,
  slotsUpgradeCost,
  type FamilyRole,
  type FamilyTab,
} from "@/lib/family";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { useGameAction } from "@/hooks/use-player";
import { cn } from "@/lib/utils";
import type { FamilyHq, FamilyInviteRow, FamilyRival } from "./hq-types";

const TABS: { id: FamilyTab; label: string; icon: typeof Users; manage?: boolean }[] = [
  { id: "overzicht", label: "Overzicht", icon: LayoutDashboard },
  { id: "leden", label: "Leden & Rollen", icon: Users },
  { id: "bank", label: "Familie Bank", icon: Landmark },
  { id: "vastgoed", label: "Bezittingen & Vastgoed", icon: Building2 },
  { id: "benefits", label: "Benefits & Upgrades", icon: Sparkles },
  { id: "misdaden", label: "Familie Misdaden", icon: Skull },
  { id: "beheer", label: "Beheer", icon: Settings, manage: true },
];

function roleBadgeClass(role: string) {
  const r = normalizeFamilyRole(role);
  if (r === "DON") return "border-[#d4a359] bg-[#d4a359]/15 text-[#d4a359]";
  if (r === "UNDERBOSS") return "border-[#d4a359]/50 bg-[#d4a359]/10 text-[#d4a359]";
  if (r === "CAPO") return "border-amber-700/60 bg-amber-950/40 text-amber-200";
  return "border-border/60 bg-muted/30 text-muted-foreground";
}

export function FamilyClient({
  selfId,
  selfRole,
  hq,
  invites,
  rivals,
}: {
  selfId: string;
  selfRole: string | null;
  hq: FamilyHq | null;
  invites: FamilyInviteRow[];
  rivals: FamilyRival[];
}) {
  if (!hq) {
    return <EmptyFamily invites={invites} />;
  }
  return <FamilyHqView selfId={selfId} selfRole={selfRole ?? "SOLDIER"} hq={hq} rivals={rivals} />;
}

function EmptyFamily({ invites }: { invites: FamilyInviteRow[] }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4a359]">Familie</p>
          <h1 className="font-heading text-3xl">Geen familie</h1>
          <p className="text-sm text-muted-foreground">Sticht een huis of accepteer een uitnodiging.</p>
        </div>
        <Link href="/game/spelers?tab=families" className="text-sm text-primary hover:underline">
          Families-klassement
        </Link>
      </div>

      {invites.length > 0 ? (
        <section className="rounded-xl border border-[#d4a359]/25 bg-[#1a1510] p-4">
          <h2 className="font-heading text-lg text-[#d4a359]">Uitnodigingen</h2>
          <div className="mt-3 space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2">
                <p className="text-sm">
                  <span className="font-heading text-[#d4a359]">{inv.familyName}</span>
                  <span className="text-muted-foreground"> · van {inv.fromName} · {inv.seats} leden</span>
                </p>
                <div className="flex gap-2">
                  <Button size="sm" disabled={pending} onClick={() => run(() => acceptFamilyInvite(inv.id), refresh)}>
                    Accepteren
                  </Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => declineFamilyInvite(inv.id), refresh)}>
                    Weigeren
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#d4a359]/25 bg-[#1a1510] p-4">
        <h2 className="font-heading text-lg">Sticht een huis</h2>
        <p className="mt-1 text-sm text-muted-foreground">Kost {formatMoney(FAMILY_CREATE_COST)} zwart geld. Jij wordt Don.</p>
        <div className="mt-3 space-y-2">
          <Input placeholder="Familienaam" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Motto" value={desc} rows={3} onChange={(e) => setDesc(e.target.value)} />
          <Button disabled={pending} onClick={() => run(() => createFamily(name, desc), refresh)}>
            Stichten
          </Button>
        </div>
      </section>
    </div>
  );
}

function FamilyHqView({
  selfId,
  selfRole,
  hq,
  rivals,
}: {
  selfId: string;
  selfRole: string;
  hq: FamilyHq;
  rivals: FamilyRival[];
}) {
  const role = normalizeFamilyRole(selfRole);
  const manage = canManageFamily(role);
  const [tab, setTab] = useState<FamilyTab>("overzicht");
  const visibleTabs = TABS.filter((item) => !item.manage || manage);

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-xl border border-[#d4a359]/30 bg-[#1a1510]">
        <div className="h-16 bg-gradient-to-r from-[#8b2626]/50 via-[#1a1510] to-[#d4a359]/20" />
        <div className="-mt-6 flex flex-wrap items-end justify-between gap-3 px-4 pb-4">
          <div className="flex items-end gap-3">
            <div className="flex size-14 items-center justify-center rounded-lg border border-[#d4a359]/50 bg-[#1a1510] font-heading text-2xl text-[#d4a359]">
              {hq.name.trim()[0]?.toUpperCase() ?? "F"}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4a359]/80">Familie</p>
              <h1 className="font-heading text-3xl text-[#d4a359]">{hq.name}</h1>
              <p className="text-xs text-muted-foreground">
                Don {hq.leaderName} · opgericht {formatDateTime(hq.createdAt)}
              </p>
            </div>
          </div>
          <Link href="/game/spelers?tab=families" className="text-sm text-primary hover:underline">
            Klassement
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row">
        <nav className="shrink-0 rounded-xl border border-[#d4a359]/25 bg-[#1a1510] p-2 lg:w-56" aria-label="Familie menu">
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {visibleTabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm whitespace-nowrap",
                    active ? "bg-[#d4a359]/15 text-[#d4a359]" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1 rounded-xl border border-border/50 bg-card/40 p-4">
          {tab === "overzicht" && <OverzichtTab hq={hq} role={role} />}
          {tab === "leden" && <LedenTab hq={hq} selfId={selfId} role={role} />}
          {tab === "bank" && <BankTab hq={hq} selfId={selfId} role={role} />}
          {tab === "vastgoed" && <VastgoedTab hq={hq} role={role} rivals={rivals} />}
          {tab === "benefits" && <BenefitsTab hq={hq} role={role} />}
          {tab === "misdaden" && <HeistsTab hq={hq} role={role} />}
          {tab === "beheer" && manage ? <BeheerTab hq={hq} selfId={selfId} role={role} /> : null}
        </div>
      </div>
    </div>
  );
}

function OverzichtTab({ hq, role }: { hq: FamilyHq; role: FamilyRole }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [note, setNote] = useState(hq.announcement);
  const level = familyLevel(hq.exp);
  const next = familyExpToNext(hq.exp);
  const buildingCount = hq.buildings.length;
  const perkCount = (hq.launderLevel > 0 ? 1 : 0) + (hq.doctorLevel > 0 ? 1 : 0) + (hq.defenseLevel > 0 ? 1 : 0);
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Kapitaal" value={formatMoney(hq.bankBalance + hq.legalBank)} />
        <Stat label="Leden" value={`${hq.members.length}/${hq.memberLimit}`} />
        <Stat label="Panden" value={String(buildingCount)} />
        <Stat label="Actieve perks" value={String(perkCount)} />
      </div>
      <p className="text-sm text-muted-foreground">
        Level {level} · {formatNumber(hq.exp)} exp{next ? ` · volgende ${formatNumber(next)}` : " · max"}
        {hq.description ? ` · ${hq.description}` : ""}
      </p>
      <div className="rounded-lg border border-[#d4a359]/20 bg-[#1a1510]/80 p-3">
        <p className="text-[11px] uppercase tracking-wider text-[#d4a359]">Mededelingenbord</p>
        {hq.announcement ? (
          <p className="mt-2 whitespace-pre-wrap text-sm">{hq.announcement}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Nog geen mededeling.</p>
        )}
        {hq.announcementAt ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(hq.announcementAt)}</p>
        ) : null}
        {canManageFamily(role) ? (
          <div className="mt-3 space-y-2">
            <Textarea value={note} maxLength={FAMILY_ANNOUNCE_MAX} rows={3} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" disabled={pending} onClick={() => run(() => pinFamilyAnnouncement(note), refresh)}>
              Pinnen
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d4a359]/20 bg-[#1a1510] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-heading text-lg text-[#d4a359]">{value}</p>
    </div>
  );
}

function LedenTab({ hq, selfId, role }: { hq: FamilyHq; selfId: string; role: FamilyRole }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [invite, setInvite] = useState("");
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(FAMILY_ROLE_RIGHTS) as FamilyRole[]).map((key) => (
          <span key={key} className={cn("rounded-full border px-2 py-0.5", roleBadgeClass(key))}>
            {familyRoleLabel(key)}
          </span>
        ))}
      </div>
      {canInviteKick(role) ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => inviteToFamily(invite), (r) => {
              if (!r.ok) return;
              setInvite("");
              router.refresh();
            });
          }}
        >
          <Input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Uitnodigen via gebruikersnaam" />
          <Button type="submit" disabled={pending}>
            Uitnodigen
          </Button>
        </form>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-[#1a1510] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Naam</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Online</th>
              <th className="px-3 py-2">Donaties</th>
              <th className="px-3 py-2">Rang</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {hq.members.map((m) => (
              <tr key={m.userId} className="border-t border-border/40">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar url={m.avatarUrl} username={m.displayName} className="size-7 text-xs" />
                    <Link href={`/game/spelers/${m.username}`} className="text-primary hover:underline">
                      {m.displayName}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-xs", roleBadgeClass(m.role))}>
                    {familyRoleLabel(m.role)}
                  </span>
                </td>
                <td className="px-3 py-2">{m.online ? "Online" : "—"}</td>
                <td className="px-3 py-2 text-xs tabular-nums">
                  {formatMoney(m.donatedCash + m.donatedLegal)} · {m.donatedBullets} kogels
                </td>
                <td className="px-3 py-2">{m.rankName}</td>
                <td className="px-3 py-2">
                  {m.userId !== selfId && familyRoleRank(role) > familyRoleRank(m.role) ? (
                    <div className="flex flex-wrap gap-1">
                      {canManageFamily(role) ? (
                        <>
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setFamilyMemberRole(m.userId, "up"), refresh)}>
                            +
                          </Button>
                          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setFamilyMemberRole(m.userId, "down"), refresh)}>
                            −
                          </Button>
                        </>
                      ) : null}
                      {canInviteKick(role) ? (
                        <Button
                          size="sm"
                          className="bg-[#8b2626] text-white hover:bg-[#8b2626]/90"
                          disabled={pending}
                          onClick={() => run(() => kickFamilyMember(m.userId), refresh)}
                        >
                          Kick
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BankTab({ hq, selfId, role }: { hq: FamilyHq; selfId: string; role: FamilyRole }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [amount, setAmount] = useState("500");
  const [kind, setKind] = useState("cash");
  const [payUser, setPayUser] = useState(hq.members.find((m) => m.userId !== selfId)?.userId ?? selfId);
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Zwart" value={formatMoney(hq.bankBalance)} />
        <Stat label="Wit" value={formatMoney(hq.legalBank)} />
        <Stat label="Kogels" value={formatNumber(hq.bulletsBank)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="cash">Zwart geld</option>
          <option value="legal">Wit geld</option>
          <option value="bullets">Kogels</option>
        </select>
        <Input type="number" className="w-28" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button disabled={pending} onClick={() => run(() => donateToFamily(kind, Number(amount)), refresh)}>
          Storten
        </Button>
      </div>
      {canManageFamily(role) ? (
        <div className="flex flex-wrap gap-2">
          <select value={payUser} onChange={(e) => setPayUser(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {hq.members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName}
              </option>
            ))}
          </select>
          <Button variant="outline" disabled={pending} onClick={() => run(() => payoutFromFamily(payUser, kind, Number(amount)), refresh)}>
            Uitbetalen
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-border/40 text-sm">
        {hq.ledger.length === 0 ? <li className="py-4 text-muted-foreground">Nog geen transacties.</li> : null}
        {hq.ledger.map((row) => (
          <li key={row.id} className="flex justify-between gap-3 py-1.5">
            <span>
              {row.note || row.type}
              {row.username ? ` · ${row.username}` : ""}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {row.asset === "BULLETS" ? `${row.amount} kogels` : formatMoney(row.amount)} · {formatDateTime(row.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VastgoedTab({
  hq,
  role,
  rivals,
}: {
  hq: FamilyHq;
  role: FamilyRole;
  rivals: FamilyRival[];
}) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };
  const owned = new Map(hq.buildings.map((b) => [b.slug, b.level]));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {FAMILY_BUILDINGS.map((def) => {
          const level = owned.get(def.slug) ?? 0;
          return (
            <div key={def.slug} className="rounded-lg border border-[#d4a359]/20 bg-[#1a1510] p-3">
              <p className="font-heading text-[#d4a359]">{def.name}</p>
              <p className="text-xs text-muted-foreground">{def.blurb}</p>
              <p className="mt-2 text-xs">
                Level {level}/3 · {formatMoney(def.cashPerHour * Math.max(1, level))}/uur
                {def.bulletsPerHour ? ` · ${def.bulletsPerHour * Math.max(1, level)} kogels/uur` : ""} · def {def.defense * Math.max(1, level)}
              </p>
              {canLeadJobs(role) ? (
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={pending || level >= 3}
                  onClick={() => run(() => buyFamilyBuilding(def.slug), refresh)}
                >
                  {level === 0 ? `Kopen ${formatMoney(def.cost)}` : `Upgrade ${formatMoney(def.cost * (level + 1))}`}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
      <div>
        <h3 className="font-heading text-lg">Rivalen</h3>
        <p className="text-xs text-muted-foreground">Hit hun kluis. Hun bunker-defensie telt mee.</p>
        <div className="mt-2 space-y-2">
          {rivals.length === 0 ? <p className="text-sm text-muted-foreground">Geen rivalen.</p> : null}
          {rivals.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2">
              <p className="text-sm">
                <span className="font-heading">{r.name}</span>
                <span className="text-muted-foreground"> · {r.members} leden · {r.buildings} panden · def {r.defenseLevel}</span>
              </p>
              {canLeadJobs(role) ? (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => raidRivalFamily(r.id), refresh)}>
                  Overval
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BenefitsTab({ hq, role }: { hq: FamilyHq; role: FamilyRole }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };
  const level = familyLevel(hq.exp);
  const nextSlots = nextMemberLimit(hq.memberLimit);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Familie-exp komt van stortingen, vastgoed, heists en straatmisdaden. Level {level}.
      </p>
      {FAMILY_UPGRADES.map((up) => {
        const current =
          up.key === "slots"
            ? hq.memberLimit
            : up.key === "launder"
              ? hq.launderLevel
              : up.key === "doctor"
                ? hq.doctorLevel
                : hq.defenseLevel;
        const maxed = up.key === "slots" ? !nextSlots : current >= up.max;
        const cost = up.key === "slots" ? slotsUpgradeCost(hq.memberLimit) : up.costFor(current);
        return (
          <div key={up.key} className="rounded-lg border border-[#d4a359]/20 bg-[#1a1510] p-3">
            <p className="font-heading text-[#d4a359]">{up.name}</p>
            <p className="text-xs text-muted-foreground">{up.blurb}</p>
            <p className="mt-1 text-xs">{up.key === "slots" ? `${hq.memberLimit} leden max` : up.effect(current)}</p>
            {canManageFamily(role) ? (
              <Button size="sm" className="mt-2" disabled={pending || maxed} onClick={() => run(() => buyFamilyUpgrade(up.key), refresh)}>
                {maxed ? "Max" : `Koop ${formatMoney(cost)}`}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function HeistsTab({ hq, role }: { hq: FamilyHq; role: FamilyRole }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };
  const level = familyLevel(hq.exp);
  const open = hq.openHeist;
  const openDef = open ? familyHeistDef(open.slug) : null;

  return (
    <div className="space-y-4">
      {open && openDef ? (
        <div className="rounded-lg border border-[#d4a359]/30 bg-[#1a1510] p-3">
          <p className="font-heading text-[#d4a359]">{openDef.name}</p>
          <p className="text-xs text-muted-foreground">{openDef.blurb}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {openDef.seats.map((seat) => {
              const taken = open.seats.find((s) => s.roleKey === seat.key)?.username;
              return (
                <Button
                  key={seat.key}
                  size="sm"
                  variant={taken ? "secondary" : "outline"}
                  disabled={pending || !!taken}
                  onClick={() => run(() => claimHeistSeat(open.id, seat.key), refresh)}
                >
                  {seat.label}
                  {taken ? ` · ${taken}` : ""}
                </Button>
              );
            })}
          </div>
          {canLeadJobs(role) ? (
            <Button className="mt-3" disabled={pending} onClick={() => run(() => runFamilyHeist(open.id), refresh)}>
              Uitvoeren
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {FAMILY_HEISTS.map((def) => (
            <div key={def.slug} className="rounded-lg border border-border/50 p-3">
              <p className="font-heading">{def.name}</p>
              <p className="text-xs text-muted-foreground">{def.blurb}</p>
              <p className="mt-1 text-xs">
                Level {def.minLevel} · {def.seats.length} rollen · {def.energy} energie · {formatMoney(def.cashMin)}–{formatMoney(def.cashMax)}
              </p>
              {canLeadJobs(role) ? (
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={pending || level < def.minLevel}
                  onClick={() => run(() => openFamilyHeist(def.slug), refresh)}
                >
                  Openen
                </Button>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Wacht tot een Capo de klus opent.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BeheerTab({ hq, selfId, role }: { hq: FamilyHq; selfId: string; role: FamilyRole }) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [motto, setMotto] = useState(hq.description);
  const [heir, setHeir] = useState(hq.members.find((m) => m.userId !== selfId)?.userId ?? "");
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Alleen Don en Underboss. Ontbinden en titel: Don.</p>
      <div className="space-y-2">
        <Textarea value={motto} rows={3} onChange={(e) => setMotto(e.target.value)} />
        <Button disabled={pending} onClick={() => run(() => updateFamilyMotto(motto), refresh)}>
          Motto opslaan
        </Button>
      </div>
      {heir && role === "DON" ? (
        <div className="flex flex-wrap gap-2">
          <select value={heir} onChange={(e) => setHeir(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {hq.members
              .filter((m) => m.userId !== selfId)
              .map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName}
                </option>
              ))}
          </select>
          <Button variant="outline" disabled={pending} onClick={() => run(() => transferDon(heir), refresh)}>
            <Crown className="mr-1 size-4" /> Titel overdragen
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {role !== "DON" ? (
          <Button variant="outline" disabled={pending} onClick={() => run(() => leaveFamily(), refresh)}>
            Verlaten
          </Button>
        ) : null}
        {role === "DON" ? (
          <Button
            className="bg-[#8b2626] text-white hover:bg-[#8b2626]/90"
            disabled={pending}
            onClick={() => run(() => disbandFamily(), refresh)}
          >
            Familie ontbinden
          </Button>
        ) : null}
      </div>
    </div>
  );
}
