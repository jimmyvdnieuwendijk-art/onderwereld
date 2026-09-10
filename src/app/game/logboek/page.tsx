import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlayer, pruneGameLogs } from "@/lib/actions/helpers";
import { LOG_MAX_PAGES, LOG_PAGE_SIZE } from "@/lib/constants";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const player = await requirePlayer();
  if (!player) redirect("/inloggen");
  await pruneGameLogs(player.id);

  const raw = Number((await searchParams).page ?? "1");
  const page = Math.min(LOG_MAX_PAGES, Math.max(1, Number.isFinite(raw) ? Math.floor(raw) : 1));
  const total = await prisma.gameLog.count({ where: { userId: player.id } });
  const pages = Math.min(LOG_MAX_PAGES, Math.max(1, Math.ceil(total / LOG_PAGE_SIZE)));
  const current = Math.min(page, pages);
  const logs = await prisma.gameLog.findMany({
    where: { userId: player.id },
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * LOG_PAGE_SIZE,
    take: LOG_PAGE_SIZE,
  });

  return (
    <div className="space-y-3">
      <h1 className="font-heading text-2xl md:text-3xl">Logboek</h1>
      <Card size="sm" className="border-border/50">
        <CardContent className="pt-3">
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nog leeg.</p>
          ) : (
            <ul className="divide-y divide-border/40 text-sm">
              {logs.map((log) => (
                <li key={log.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <p className="min-w-0 leading-snug">{log.message}</p>
                  <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {pages > 1 ? (
        <nav className="flex justify-center gap-1" aria-label="Logboek pagina&apos;s">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={n === 1 ? "/game/logboek" : `/game/logboek?page=${n}`}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-sm",
                n === current
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}