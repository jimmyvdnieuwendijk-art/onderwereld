import { prisma } from "@/lib/prisma";
import { cityDisplayName } from "@/lib/airports";
import { clamp, randomInt } from "@/lib/format";
import {
  MAX_PIMP_HOURS_PER_TICK,
  PIMP_HOUR_MS,
  RAID_WANTED_BUMP,
  hourlyPayout,
  pimpRankFor,
  raidChancePercent,
} from "@/lib/pimp";

type TickResult = {
  changed: boolean;
  cashDelta: number;
  raided: boolean;
};

export async function tickPimpEconomy(userId: string, now = new Date()): Promise<TickResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastPimpTickAt: true,
      wantedLevel: true,
      currentCity: true,
      mainEscortId: true,
      pimpExp: true,
    },
  });
  if (!user) return { changed: false, cashDelta: 0, raided: false };

  const elapsed = now.getTime() - user.lastPimpTickAt.getTime();
  const hours = Math.min(MAX_PIMP_HOURS_PER_TICK, Math.floor(elapsed / PIMP_HOUR_MS));
  if (hours <= 0) return { changed: false, cashDelta: 0, raided: false };

  const [escorts, windows] = await Promise.all([
    prisma.escort.findMany({ where: { ownerId: userId } }),
    prisma.redLightWindow.findMany({ where: { ownerId: userId } }),
  ]);

  const windowById = new Map(windows.map((row) => [row.id, row]));
  const state = escorts.map((row) => ({
    id: row.id,
    name: row.name,
    charm: row.charm,
    loyalty: row.loyalty,
    health: row.health,
    cityId: row.cityId,
    windowId: row.windowId,
    listedPrice: row.listedPrice,
    gone: false,
    unassign: false,
  }));

  let income = 0;
  let pimpExpGain = 0;
  const logs: string[] = [];

  for (let h = 0; h < hours; h++) {
    let hourIncome = 0;
    let earningWorkers = 0;

    for (const escort of state) {
      if (escort.gone) continue;

      const window = escort.windowId ? windowById.get(escort.windowId) : undefined;
      const hourEnd = user.lastPimpTickAt.getTime() + (h + 1) * PIMP_HOUR_MS;
      const assigned =
        !escort.unassign &&
        !!window &&
        window.hiredUntil.getTime() >= hourEnd &&
        window.cityId === escort.cityId &&
        !escort.listedPrice;

      if (assigned) {
        escort.loyalty = clamp(escort.loyalty - randomInt(1, 3), 0, 100);
        if (Math.random() < 0.08) {
          escort.health = clamp(escort.health - randomInt(8, 22), 0, 100);
          logs.push(`${escort.name} raakt aangeslagen op het raam. Gezondheid ${escort.health}.`);
        }
        if (escort.loyalty <= 12 && Math.random() < 0.22) {
          escort.gone = true;
          escort.unassign = true;
          logs.push(`${escort.name} is vertrokken. Te weinig loyaliteit — de stal is een kop kleiner.`);
          continue;
        }
        if (escort.health <= 8) {
          escort.unassign = true;
          escort.windowId = null;
          escort.health = Math.max(escort.health, 5);
          logs.push(`${escort.name} is uit de running. Eerst herstellen, dan weer het raam.`);
          continue;
        }
        hourIncome += hourlyPayout(escort.charm, escort.loyalty, escort.health, escort.cityId);
        earningWorkers += 1;
      } else {
        escort.loyalty = clamp(escort.loyalty + 1, 0, 100);
        escort.health = clamp(escort.health + 2, 0, 100);
      }
    }

    income += hourIncome;
    pimpExpGain += earningWorkers;
  }

  const raidRoll = randomInt(1, 100);
  const raidChance = raidChancePercent(user.wantedLevel, user.currentCity);
  const raided = income > 0 && raidRoll <= raidChance;
  const cashDelta = raided ? 0 : income;
  const wantedDelta = raided ? RAID_WANTED_BUMP : 0;
  const lastTickAt = new Date(user.lastPimpTickAt.getTime() + hours * PIMP_HOUR_MS);

  if (raided) {
    logs.unshift(
      `Razzia in ${cityDisplayName(user.currentCity)}. De wijk is rood van de zwaailichten — omzet van deze ronde kwijt. Gezocht +${RAID_WANTED_BUMP}.`,
    );
  } else if (cashDelta > 0) {
    logs.unshift(`Ramen: ${cashDelta} euro binnen over ${hours === 1 ? "een speeluur" : `${hours} speeluren`}.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        cash: cashDelta > 0 ? { increment: cashDelta } : undefined,
        wantedLevel: wantedDelta > 0 ? Math.min(100, user.wantedLevel + wantedDelta) : undefined,
        pimpExp: pimpExpGain > 0 ? { increment: pimpExpGain } : undefined,
        lastPimpTickAt: lastTickAt,
        lastRaidAt: raided ? now : undefined,
        mainEscortId: state.some((row) => row.gone && row.id === user.mainEscortId) ? null : undefined,
      },
    });

    for (const escort of state) {
      if (escort.gone) {
        await tx.escort.delete({ where: { id: escort.id } });
        continue;
      }
      await tx.escort.update({
        where: { id: escort.id },
        data: {
          loyalty: escort.loyalty,
          health: escort.health,
          windowId: escort.unassign ? null : escort.windowId,
        },
      });
    }

    for (const message of logs.slice(0, 8)) {
      await tx.gameLog.create({ data: { userId, type: "PIMP", message } });
    }
  });

  const rankBefore = pimpRankFor(user.pimpExp).slug;
  const rankAfter = pimpRankFor(user.pimpExp + pimpExpGain).slug;
  if (rankBefore !== rankAfter) {
    const rank = pimpRankFor(user.pimpExp + pimpExpGain);
    await prisma.gameLog.create({
      data: {
        userId,
        type: "PIMP",
        message: `Je pimp-rang stijgt naar ${rank.name}. Meer ramen, meer druk.`,
      },
    });
  }

  return { changed: true, cashDelta, raided };
}
