"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createFamily,
  disbandFamily,
  donateToFamily,
  joinFamily,
  leaveFamily,
} from "@/lib/actions/social";
import { FAMILY_CREATE_COST } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGameAction } from "@/hooks/use-player";
import { useRouter } from "next/navigation";

type FamilyRow = {
  id: string;
  name: string;
  description: string;
  bankBalance: number;
  leader: { username: string };
  memberships: { userId: string; role: string; user: { username: string } }[];
};

export function FamilyClient({
  mine,
  families,
  isLeader,
}: {
  mine: FamilyRow | null;
  families: FamilyRow[];
  isLeader: boolean;
}) {
  const { run, pending } = useGameAction();
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("500");
  const refresh = (r: { ok: boolean }) => {
    if (r.ok) router.refresh();
  };

  if (mine) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="font-heading text-3xl">{mine.name}</h1>
          <Link href="/game/spelers?tab=families" className="text-sm text-primary hover:underline">
            Families-klassement
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Familie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{mine.description || "Geen motto."}</p>
            <p>Leider: {mine.leader.username}</p>
            <p>Kas: {formatMoney(mine.bankBalance)}</p>
            <div className="flex flex-wrap gap-2">
              {mine.memberships.map((m) => (
                <Badge key={m.userId} variant="secondary">
                  {m.user.username} · {m.role}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
              <Button disabled={pending} onClick={() => run(() => donateToFamily(Number(amount)), refresh)}>
                Doneren
              </Button>
            </div>
            {isLeader ? (
              <Button variant="destructive" disabled={pending} onClick={() => run(() => disbandFamily(), refresh)}>
                Familie ontbinden
              </Button>
            ) : (
              <Button variant="outline" disabled={pending} onClick={() => run(() => leaveFamily(), refresh)}>
                Verlaten
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-heading text-3xl">Families</h1>
        <Link href="/game/spelers?tab=families" className="text-sm text-primary hover:underline">
          Families-klassement
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sticht een huis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Kost {formatMoney(FAMILY_CREATE_COST)} cash.</p>
          <Input placeholder="Naam" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Motto" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Button disabled={pending} onClick={() => run(() => createFamily(name, desc), refresh)}>
            Stichten
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {families.length === 0 && <p className="text-muted-foreground">Nog geen families.</p>}
        {families.map((fam) => (
          <Card key={fam.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div>
                <p className="font-heading text-lg">{fam.name}</p>
                <p className="text-sm text-muted-foreground">
                  {fam.leader.username} · {fam.memberships.length} leden · kas {formatMoney(fam.bankBalance)}
                </p>
              </div>
              <Button disabled={pending} onClick={() => run(() => joinFamily(fam.id), refresh)}>
                Lid worden
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
