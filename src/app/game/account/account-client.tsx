"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  beginTotpSetup,
  changePassword,
  confirmTotp,
  disableTotp,
  removeAvatar,
  updateAppearance,
  updateBio,
  uploadAvatar,
} from "@/lib/actions/account";
import { logoutAction } from "@/lib/actions/session";
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_BYTES,
  BIO_MAX,
  DISPLAY_NAME_MAX,
  PASSWORD_MIN,
} from "@/lib/constants";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import type { ActionResult, PlayerSnapshot } from "@/types/game";

function FormMessage({ state }: { state: ActionResult | null }) {
  if (!state?.message) return null;
  return (
    <p className={`text-sm ${state.ok ? "text-primary" : "text-destructive"}`}>{state.message}</p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-heading text-sm">{value}</p>
    </div>
  );
}

export function AccountClient({ initialPlayer }: { initialPlayer: PlayerSnapshot }) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const avatarAct = useGameAction();
  const bioAct = useGameAction();
  const lookAct = useGameAction();
  const passwordAct = useGameAction();
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [bio, setBio] = useState(initialPlayer.bio ?? "");
  const [displayName, setDisplayName] = useState(initialPlayer.displayName ?? "");
  const [bioHidden, setBioHidden] = useState(initialPlayer.bioHidden);
  const [hideOnline, setHideOnline] = useState(initialPlayer.hideOnline);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function replacePreview(nextUrl: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = nextUrl;
    setPreview(nextUrl);
  }

  const shownAvatar = preview ?? p.avatarUrl;
  const shownName = (p.displayName?.trim() || p.username);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary/80">Account</p>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-heading text-2xl leading-none md:text-3xl">Profiel</h1>
          </div>
          <Link
            href={`/game/spelers/${p.username}`}
            prefetch
            className="text-sm text-primary hover:underline"
          >
            Bekijk publiek profiel
          </Link>
        </div>
      </header>

      <Card size="sm" className="border-border/50">
        <CardHeader className="border-b border-border/40">
          <CardTitle>Profiel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <PlayerAvatar url={shownAvatar} username={shownName} className="size-20 shrink-0 text-2xl" />
            <div className="min-w-0 space-y-1">
              <p className="font-heading text-xl leading-none">{shownName}</p>
              <p className="truncate text-sm text-muted-foreground">
                @{p.username} · {p.email}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge>{p.rank.name}</Badge>
                {p.family ? (
                  <Badge variant="secondary">{p.family.name}</Badge>
                ) : (
                  <Badge variant="outline">Solo</Badge>
                )}
                <Badge variant="outline">{p.currentCityName}</Badge>
              </div>
            </div>
          </div>
          <section className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="Exp" value={formatNumber(p.exp)} />
            <Stat label="Cash" value={formatMoney(p.cash)} />
            <Stat label="Bank" value={formatMoney(p.bankBalance)} />
            <Stat label="Kills" value={String(p.killCount)} />
            <Stat label="HP" value={`${p.health}/100`} />
            <Stat label="Energie" value={`${p.energy}/100`} />
            <Stat label="Aanval" value={String(p.attackPower)} />
            <Stat
              label="Lid sinds"
              value={new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(
                new Date(p.createdAt),
              )}
            />
            <Stat
              label="Laatst in"
              value={
                p.lastLoginAt
                  ? formatDateTime(p.lastLoginAt)
                  : "Deze sessie"
              }
            />
          </section>
        </CardContent>
      </Card>

      <Card size="sm" className="border-border/50">
        <CardHeader className="border-b border-border/40">
          <CardTitle>Weergave</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              lookAct.run(() => updateAppearance(displayName, bioHidden, hideOnline));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="displayName">Weergavenaam</Label>
              <Input
                id="displayName"
                name="displayName"
                value={displayName}
                maxLength={DISPLAY_NAME_MAX}
                placeholder={p.username || "DonDemo"}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                {displayName.length}/{DISPLAY_NAME_MAX}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={bioHidden}
                  onChange={(event) => setBioHidden(event.target.checked)}
                />
                <span>Verberg je bio</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={hideOnline}
                  onChange={(event) => setHideOnline(event.target.checked)}
                />
                <span>Verberg online status</span>
              </label>
            </div>
            <Button type="submit" disabled={lookAct.pending}>
              {lookAct.pending ? "Opslaan…" : "Weergave opslaan"}
            </Button>
            <FormMessage state={lookAct.feedback} />
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm" className="border-border/50">
          <CardHeader className="border-b border-border/40">
            <CardTitle>Profielfoto uploaden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-3">
              <PlayerAvatar url={shownAvatar} username={shownName} className="size-16 text-lg" />
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const file = fileInputRef.current?.files?.[0];
                if (!file) return;
                avatarAct.run(() => uploadAvatar(file), (result) => {
                  if (!result.ok) return;
                  replacePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="avatar">Bestand</Label>
                <Input
                  ref={fileInputRef}
                  id="avatar"
                  name="avatar"
                  type="file"
                  accept={AVATAR_ACCEPT}
                  required
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    replacePreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
                {avatarAct.feedback && !avatarAct.feedback.ok ? (
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG of WebP · max {Math.round(AVATAR_MAX_BYTES / 1_000_000)} MB
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={avatarAct.pending}>
                  {avatarAct.pending ? "Uploaden…" : "Foto opslaan"}
                </Button>
                {p.avatarUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={avatarAct.pending}
                    onClick={() =>
                      avatarAct.run(() => removeAvatar(), (result) => {
                        if (!result.ok) return;
                        replacePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      })
                    }
                  >
                    Foto verwijderen
                  </Button>
                ) : null}
              </div>
              <FormMessage state={avatarAct.feedback} />
            </form>
          </CardContent>
        </Card>

        <Card size="sm" className="border-border/50">
          <CardHeader className="border-b border-border/40">
            <CardTitle>Bio</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                bioAct.run(() => updateBio(bio));
              }}
            >
              <Textarea
                name="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={BIO_MAX}
                rows={6}
                placeholder="Wie ben je in de straat…"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {bio.length}/{BIO_MAX}
                </p>
                <Button type="submit" disabled={bioAct.pending}>
                  {bioAct.pending ? "Opslaan…" : "Bio opslaan"}
                </Button>
              </div>
              <FormMessage state={bioAct.feedback} />
            </form>
          </CardContent>
        </Card>
      </div>

      <Card size="sm" className="border-border/50">
        <CardHeader className="border-b border-border/40">
          <CardTitle>Wachtwoord wijzigen</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            ref={passwordFormRef}
            className="max-w-md space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              passwordAct.run(() => changePassword(current, next, confirm), (result) => {
                if (!result.ok) return;
                setCurrent("");
                setNext("");
                setConfirm("");
                passwordFormRef.current?.reset();
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="current">Huidig wachtwoord</Label>
              <Input
                id="current"
                name="current"
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next">Nieuw wachtwoord</Label>
              <Input
                id="next"
                name="next"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN}
                required
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Bevestig nieuw wachtwoord</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN}
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={passwordAct.pending}>
              {passwordAct.pending ? "Wijzigen…" : "Wachtwoord opslaan"}
            </Button>
            <FormMessage state={passwordAct.feedback} />
          </form>
        </CardContent>
      </Card>

      <TotpCard enabled={p.totpEnabled} />

      <Card size="sm" className="border-border/50">
        <CardHeader className="border-b border-border/40">
          <CardTitle>Sessie</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="gap-2">
              <LogOut className="size-4" />
              Uitloggen
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function TotpCard({ enabled }: { enabled: boolean }) {
  const setupAct = useGameAction();
  const confirmAct = useGameAction();
  const disableAct = useGameAction();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ qrDataUrl?: string; secret?: string } | null>(null);

  const qr =
    (setupAct.feedback?.data as { qrDataUrl?: string; secret?: string } | undefined)?.qrDataUrl ??
    setup?.qrDataUrl;
  const secret =
    (setupAct.feedback?.data as { secret?: string } | undefined)?.secret ?? setup?.secret;

  return (
    <Card size="sm" className="border-border/50">
      <CardHeader className="border-b border-border/40">
        <CardTitle>Authenticator (2FA)</CardTitle>
      </CardHeader>
      <CardContent className="max-w-md space-y-3 pt-4">
        {enabled ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              disableAct.run(() => disableTotp(password, code), (result) => {
                if (!result.ok) return;
                setCode("");
                setPassword("");
              });
            }}
          >
            <p className="text-sm">Authenticator staat aan.</p>
            <div className="space-y-2">
              <Label htmlFor="totp-pass">Wachtwoord</Label>
              <Input
                id="totp-pass"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totp-off">Authenticatorcode</Label>
              <Input
                id="totp-off"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={disableAct.pending}>
              {disableAct.pending ? "Uitschakelen…" : "Uitschakelen"}
            </Button>
            <FormMessage state={disableAct.feedback} />
          </form>
        ) : (
          <div className="space-y-3">
            {!qr ? (
              <Button
                type="button"
                disabled={setupAct.pending}
                onClick={() =>
                  setupAct.run(() => beginTotpSetup(), (result) => {
                    if (!result.ok) return;
                    setSetup((result.data as { qrDataUrl?: string; secret?: string }) ?? null);
                  })
                }
              >
                {setupAct.pending ? "Bezig…" : "Authenticator instellen"}
              </Button>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR-code voor authenticator" className="size-44 rounded-md bg-white p-1" />
                {secret ? (
                  <p className="break-all font-mono text-xs text-muted-foreground">{secret}</p>
                ) : null}
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    confirmAct.run(() => confirmTotp(code), (result) => {
                      if (!result.ok) return;
                      setCode("");
                      setSetup(null);
                    });
                  }}
                >
                  <Label htmlFor="totp-on">Code uit de app</Label>
                  <Input
                    id="totp-on"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    required
                  />
                  <Button type="submit" disabled={confirmAct.pending}>
                    {confirmAct.pending ? "Bevestigen…" : "Bevestigen"}
                  </Button>
                </form>
              </>
            )}
            <FormMessage state={setupAct.feedback} />
            <FormMessage state={confirmAct.feedback} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
