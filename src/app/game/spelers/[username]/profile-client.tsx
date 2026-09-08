"use client";

import { attackPlayerForm } from "@/lib/actions/combat";
import { sendMessageForm } from "@/lib/actions/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import type { PublicPlayer } from "@/types/game";

export function PlayerProfileClient({ target }: { target: PublicPlayer }) {
  const [attackState, attackAction, attacking] = useFormAction(attackPlayerForm);
  const [msgState, msgAction, messaging] = useFormAction(sendMessageForm);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-3xl">{target.username}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{target.rankName}</Badge>
            <Badge variant="secondary">{target.currentCityName}</Badge>
            <Badge variant="outline">HP {target.health}</Badge>
            <Badge variant="outline">{target.killCount} kills</Badge>
            {target.familyName && <Badge variant="secondary">{target.familyName}</Badge>}
            {target.inJail && <Badge variant="destructive">Cel</Badge>}
            {target.inHospital && <Badge variant="destructive">Ziekenhuis</Badge>}
            {target.isTraveling && <Badge variant="secondary">In de lucht</Badge>}
          </div>
          <form action={attackAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="defenderId" value={target.id} />
            <Input type="number" min={1} max={25} name="bullets" defaultValue="5" className="w-24" />
            <Button type="submit" disabled={attacking || target.inJail || target.inHospital || target.isDead || target.isTraveling}>
              {target.isTraveling ? "In de lucht" : "Aanvallen"}
            </Button>
          </form>
          <ActionFeedback state={attackState} />
          <p className="text-xs text-muted-foreground">
            Vereist een uitgerust wapen en kogels. Cash op zak van het slachtoffer kan worden geroofd.
            Banksaldo blijft veilig.
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
