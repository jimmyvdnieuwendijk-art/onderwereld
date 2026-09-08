"use client";

import { useState } from "react";
import { attackPlayer } from "@/lib/actions/combat";
import { sendMessage } from "@/lib/actions/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGameAction } from "@/hooks/use-player";
import type { PublicPlayer } from "@/types/game";

export function PlayerProfileClient({ target }: { target: PublicPlayer }) {
  const { run, pending } = useGameAction();
  const [bullets, setBullets] = useState("5");
  const [subject, setSubject] = useState("Bericht");
  const [body, setBody] = useState("");

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-3xl">{target.username}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{target.rankName}</Badge>
            <Badge variant="secondary">{target.currentCity}</Badge>
            <Badge variant="outline">HP {target.health}</Badge>
            <Badge variant="outline">{target.killCount} kills</Badge>
            {target.familyName && <Badge variant="secondary">{target.familyName}</Badge>}
            {target.inJail && <Badge variant="destructive">Cel</Badge>}
            {target.inHospital && <Badge variant="destructive">Ziekenhuis</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              type="number"
              min={1}
              max={25}
              value={bullets}
              onChange={(e) => setBullets(e.target.value)}
              className="w-24"
            />
            <Button
              disabled={pending || target.inJail || target.inHospital || target.isDead}
              onClick={() => run(() => attackPlayer(target.id, Number(bullets)))}
            >
              Aanvallen
            </Button>
          </div>
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
        <CardContent className="space-y-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Onderwerp" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tekst" rows={4} />
          <Button disabled={pending} onClick={() => run(() => sendMessage(target.username, subject, body))}>
            Versturen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
