"use client";

import { useState } from "react";
import { bankDeposit, bankWithdraw } from "@/lib/actions/economy";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameAction, usePlayer } from "@/hooks/use-player";
import type { PlayerSnapshot } from "@/types/game";

export function BankClient({ initialPlayer }: { initialPlayer: PlayerSnapshot }) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const { run, pending, feedback } = useGameAction();
  const [amount, setAmount] = useState("100");
  const value = Number(amount) || 0;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-heading text-3xl">Bank</h1>
      <Card>
        <CardHeader>
          <CardTitle>Rekening</CardTitle>
          <CardDescription>
            Cash op zak kan bij een overval worden gestolen. Geld op de bank is veilig.
            Er wordt 1% rente per uur bijgeschreven wanneer je speelt (geen aparte cron nodig).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Contant: <span className="text-primary">{formatMoney(p.cash)}</span>
          </p>
          <p>
            Bank: <span className="text-primary">{formatMoney(p.bankBalance)}</span>
          </p>
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
            {feedback && (
              <p className={`text-sm ${feedback.ok ? "text-primary" : "text-destructive"}`}>{feedback.message}</p>
            )}
            <div className="flex gap-2">
            <Button disabled={pending || value < 1} onClick={() => run(() => bankDeposit(value))}>
              Storten
            </Button>
            <Button
              variant="outline"
              disabled={pending || value < 1}
              onClick={() => run(() => bankWithdraw(value))}
            >
              Opnemen
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => bankDeposit(p.cash))}>
              Alles storten
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
