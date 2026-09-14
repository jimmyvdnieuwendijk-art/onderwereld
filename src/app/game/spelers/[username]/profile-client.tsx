"use client";

import { attackPlayerForm } from "@/lib/actions/combat";
import { sendMessageForm } from "@/lib/actions/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import { formatMoney, formatNumber } from "@/lib/format";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { useLivePlayer } from "@/hooks/use-player";
import { ammoKindMeta, ammoQtyForKind } from "@/lib/shop-catalog";
import type { PublicPlayer } from "@/types/game";

export function PlayerProfileClient({ target }: { target: PublicPlayer }) {
  const [attackState, attackAction, attacking] = useFormAction(attackPlayerForm);
  const [msgState, msgAction, messaging] = useFormAction(sendMessageForm);
  const me = useLivePlayer();
  const ammoMeta = ammoKindMeta(me?.equippedWeapon?.ammoKind);
  const haveAmmo = ammoQtyForKind(me?.inventory ?? [], me?.equippedWeapon?.ammoKind);
  const needsAmmo = !!ammoMeta;
  const canShoot = !!me?.equippedWeapon && (!needsAmmo || haveAmmo >= 1);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <PlayerAvatar
              url={target.avatarUrl}
              username={target.displayName}
              className="size-16 shrink-0 text-xl md:size-20 md:text-2xl"
            />
            <div className="min-w-0">
              <CardTitle className="font-heading text-3xl">{target.displayName}</CardTitle>
              {target.displayName !== target.username ? (
                <p className="mt-1 text-sm text-muted-foreground">@{target.username}</p>
              ) : null}
              {target.bio ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {target.bio}
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{target.rankName}</Badge>
            {target.isOnline && <Badge variant="outline">Online</Badge>}
            <Badge variant="outline">{formatNumber(target.exp)} exp</Badge>
            <Badge variant="outline">{formatMoney(target.cash)} cash</Badge>
            <Badge variant="outline">HP {target.health}</Badge>
            <Badge variant="outline">{target.killCount} kills</Badge>
            {target.familyName && <Badge variant="secondary">{target.familyName}</Badge>}
            {target.inJail && <Badge variant="destructive">Cel</Badge>}
            {target.inHospital && <Badge variant="destructive">Ziekenhuis</Badge>}
            {target.isTraveling && <Badge variant="secondary">In de lucht</Badge>}
          </div>
          <form action={attackAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="defenderId" value={target.id} />
            {needsAmmo ? (
              <Input
                type="number"
                min={1}
                max={Math.min(25, Math.max(1, haveAmmo))}
                name="bullets"
                defaultValue={String(Math.min(5, Math.max(1, haveAmmo)))}
                className="w-24"
              />
            ) : (
              <input type="hidden" name="bullets" value="1" />
            )}
            <Button
              type="submit"
              disabled={
                attacking ||
                !canShoot ||
                target.inJail ||
                target.inHospital ||
                target.isDead ||
                target.isTraveling
              }
            >
              {target.isTraveling ? "In de lucht" : "Aanvallen"}
            </Button>
          </form>
          <ActionFeedback state={attackState} />
          <p className="text-xs text-muted-foreground">
            {!me?.equippedWeapon
              ? "Rust eerst een wapen uit via Overzicht."
              : needsAmmo
                ? `${me.equippedWeapon?.name} gebruikt alleen ${ammoMeta?.ammoName} (${haveAmmo} patronen). Cash op zak kan worden geroofd; banksaldo blijft veilig.`
                : `${me.equippedWeapon?.name} heeft geen munitie nodig. Cash op zak kan worden geroofd; banksaldo blijft veilig.`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stuur een bericht</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={msgAction} className="space-y-2">
            <input type="hidden" name="to" value={target.username} />
            <Input name="subject" defaultValue="Bericht" placeholder="Onderwerp" />
            <Textarea name="body" placeholder="Tekst" rows={4} />
            <Button type="submit" disabled={messaging}>
              Versturen
            </Button>
            <ActionFeedback state={msgState} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
