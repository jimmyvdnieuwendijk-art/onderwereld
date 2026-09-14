"use client";

import { useMemo, useState } from "react";
import { bankForm } from "@/lib/actions/economy";
import { bankWithdrawPayout } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLivePlayer } from "@/hooks/use-player";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import type { PlayerSnapshot } from "@/types/game";

export function BankClient({ initialPlayer }: { initialPlayer?: PlayerSnapshot }) {
  const p = useLivePlayer(initialPlayer)!;
  const [state, action, pending] = useFormAction(bankForm);
  const [amount, setAmount] = useState("100");

  const payout = useMemo(() => bankWithdrawPayout(Number(amount) || 0), [amount]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary/80">Kluis</p>
        <h1 className="font-heading text-3xl">Bank</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cash op zak kan bij een overval verdwijnen. Geld op de rekening blijft staan en krijgt 1% rente per uur.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Op zak</CardDescription>
            <CardTitle className="font-heading text-2xl tabular-nums">{formatMoney(p.cash)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Op de rekening</CardDescription>
            <CardTitle className="font-heading text-2xl tabular-nums text-primary">
              {formatMoney(p.bankBalance)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storten of opnemen</CardTitle>
          <CardDescription>
            Bij opnemen gaat 1% van het bedrag af als kosten. Je ontvangt 99% contant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Bedrag</span>
              <Input
                type="number"
                min={1}
                name="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            {payout.value >= 2 && payout.received >= 1 ? (
              <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                Opnemen: 1% kosten ({formatMoney(payout.fee)}) → je ontvangt{" "}
                <span className="font-medium text-primary">{formatMoney(payout.received)}</span>.
              </p>
            ) : payout.value > 0 ? (
              <p className="text-sm text-muted-foreground">Neem minstens 2 euro op voor de 1% kosten.</p>
            ) : null}
            <ActionFeedback state={state} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="op" value="deposit" disabled={pending}>
                Storten
              </Button>
              <Button type="submit" name="op" value="withdraw" variant="outline" disabled={pending}>
                Opnemen
              </Button>
              <Button type="submit" name="op" value="all" variant="secondary" disabled={pending}>
                Alles storten
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
