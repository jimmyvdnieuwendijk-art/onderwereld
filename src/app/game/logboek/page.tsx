import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/actions/helpers";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LogPage() {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  const logs = await prisma.gameLog.findMany({
    where: { userId: player.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl">Logboek</h1>
      <Card>
        <CardHeader>
          <CardTitle>Geschiedenis</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground">Nog leeg.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {logs.map((log) => (
                <li key={log.id} className="border-b border-border/40 pb-2">
                  <p>{log.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.type} · {formatDateTime(log.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
