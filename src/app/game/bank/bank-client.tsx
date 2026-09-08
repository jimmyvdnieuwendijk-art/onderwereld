"use client";

import { bankForm } from "@/lib/actions/economy";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlayer } from "@/hooks/use-player";
import { ActionFeedback, useFormAction } from "@/components/game/action-feedback";
import type { PlayerSnapshot } from "@/types/game";

export function BankClient({ initialPlayer }: { initialPlayer: PlayerSnapshot }) {
  const { data: player } = usePlayer(initialPlayer);
  const p = player ?? initialPlayer;
  const [state, action, pending] = useFormAction(bankForm);

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
          <form action={action} method="post" className="space-y-3">
            <Input type="number" min={1} name="amount" defaultValue="100" />
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
