import { prisma } from "@/lib/prisma";
import { cityDisplayName } from "@/lib/airports";
import { clamp, randomInt } from "@/lib/format";
import {
  DARK_ROOMS,
  DRUG_RUN_PIMP_EXP,
  MAX_PIMP_HOURS_PER_TICK,
  MISSION_DARK_ROOM,
  MISSION_DRUG_RUN,
  PIMP_HOUR_MS,
  RAID_WANTED_BUMP,
  darkRoomByKey,
  hourlyPayout,
  pimpRankFor,
  raidChancePercent,
} from "@/lib/pimp";

type TickResult = {
  changed: boolean;
  cashDelta: number;
  raided: boolean;
};

function clearMission() {
  return { busyUntil: null, missionKind: null, missionKey: null, windowId: null };
}

async function resolveMissions(userId: string, now: Date) {
  const due = await prisma.escort.findMany({
    where: {
      ownerId: userId,
      missionKind: { not: null },
      busyUntil: { lte: now },
    },
  });
  if (due.length === 0) return { changed: false, cash: 0, drugs: 0, pimpExp: 0, wanted: 0, jailUntil: null as Date | null, logs: [] as string[] };

  let cash = 0;
  let drugs = 0;
  let pimpExp = 0;
  let wanted = 0;
  let jailUntil: Date | null = null;
  const logs: string[] = [];

  for (const escort of due) {
    if (escort.missionKind === MISSION_DARK_ROOM) {
      const room = darkRoomByKey(escort.missionKey ?? "");
      const session = room ?? DARK_ROOMS[0];
      const payout = Math.max(
        40,
        Math.floor(session.cashBase * (0.55 + escort.charm / 140) * (0.7 + escort.loyalty / 250)),
      );
      cash += payout;
      pimpExp += session.pimpExp;
      const loyalty = clamp(escort.loyalty + session.loyaltyDelta, 0, 100);
      const health = clamp(escort.health + session.healthDelta, 8, 100);
      if (randomInt(1, 100) <= session.wantedChance) wanted += 4;
      await prisma.escort.update({
        where: { id: escort.id },
        data: { loyalty, health, ...clearMission() },
      });
      logs.push(`${escort.name} sluit ${session.name} af. Afdracht ${payout} euro. Zij is vrij voor de volgende boeking.`);
      continue;
    }

    if (escort.missionKind === MISSION_DRUG_RUN) {
      const roll = randomInt(1, 100);
      if (roll <= 62) {
        const pack = randomInt(2, 6);
        const tip = randomInt(70, 180);
        drugs += pack;
        cash += tip;
        pimpExp += DRUG_RUN_PIMP_EXP;
        await prisma.escort.update({
          where: { id: escort.id },
          data: { ...clearMission(), health: clamp(escort.health - randomInt(0, 6), 8, 100) },
        });
        logs.push(`${escort.name} komt terug van de pickup: ${pack} drugs en ${tip} euro. Schoon door de controle.`);
      } else if (roll <= 88) {
        wanted += 8;
        const dmg = randomInt(10, 22);
        await prisma.escort.update({
          where: { id: escort.id },
          data: { ...clearMission(), health: clamp(escort.health - dmg, 8, 100) },
        });
        logs.push(`${escort.name} wordt staande gehouden. Geen waar, gezocht +8, gezondheid -${dmg}.`);
      } else {
        wanted += 14;
        jailUntil = new Date(now.getTime() + 2 * 60 * 1000);
        await prisma.escort.update({
          where: { id: escort.id },
          data: { ...clearMission(), health: clamp(escort.health - 12, 8, 100) },
        });
        logs.push(`${escort.name} wordt met de auto meegenomen. Jij zit 2 minuten vast. Geen drugs.`);
      }
      continue;
    }

    await prisma.escort.update({
      where: { id: escort.id },
      data: clearMission(),
    });
  }

  return { changed: true, cash, drugs, pimpExp, wanted, jailUntil, logs };
}

export async function tickPimpEconomy(userId: string, now = new Date()): Promise<TickResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastPimpTickAt: true,
      wantedLevel: true,
      currentCity: true,
      mainEscortId: true,
      pimpExp: true,
      inJailUntil: true,
    },
  });
  if (!user) return { changed: false, cashDelta: 0, raided: false };

  const missions = await resolveMissions(userId, now);

  const elapsed = now.getTime() - user.lastPimpTickAt.getTime();
  const hours = Math.min(MAX_PIMP_HOURS_PER_TICK, Math.floor(elapsed / PIMP_HOUR_MS));
  if (hours <= 0 && !missions.changed) return { changed: false, cashDelta: 0, raided: false };

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
    busyUntil: row.busyUntil,
    missionKind: row.missionKind,
    gone: false,
    unassign: false,
  }));

  let income = 0;
  let pimpExpGain = missions.pimpExp;
  const logs: string[] = [...missions.logs];

  for (let h = 0; h < hours; h++) {
    let hourIncome = 0;
    let earningWorkers = 0;
    const hourEnd = user.lastPimpTickAt.getTime() + (h + 1) * PIMP_HOUR_MS;

    for (const escort of state) {
      if (escort.gone) continue;
      const onMission = !!(escort.busyUntil && escort.busyUntil.getTime() > hourEnd);
      if (onMission || escort.missionKind) {
        continue;
      }

      const window = escort.windowId ? windowById.get(escort.windowId) : undefined;
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
      } else if (!escort.listedPrice) {
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
  const cashDelta = (raided ? 0 : income) + missions.cash;
  const wantedNext = Math.min(100, user.wantedLevel + (raided ? RAID_WANTED_BUMP : 0) + missions.wanted);
  const lastTickAt =
    hours > 0 ? new Date(user.lastPimpTickAt.getTime() + hours * PIMP_HOUR_MS) : user.lastPimpTickAt;

  if (raided) {
    logs.unshift(
      `Razzia in ${cityDisplayName(user.currentCity)}. De wijk is rood van de zwaailichten — raam-omzet van deze ronde kwijt. Gezocht +${RAID_WANTED_BUMP}.`,
    );
  } else if (income > 0) {
    logs.unshift(`Ramen: ${income} euro binnen over ${hours === 1 ? "een speeluur" : `${hours} speeluren`}.`);
  }

  const jailUntil =
    missions.jailUntil && (!user.inJailUntil || missions.jailUntil > user.inJailUntil)
      ? missions.jailUntil
      : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        cash: cashDelta > 0 ? { increment: cashDelta } : undefined,
        drugs: missions.drugs > 0 ? { increment: missions.drugs } : undefined,
        wantedLevel: wantedNext !== user.wantedLevel ? wantedNext : undefined,
        pimpExp: pimpExpGain > 0 ? { increment: pimpExpGain } : undefined,
        lastPimpTickAt: lastTickAt,
        lastRaidAt: raided ? now : undefined,
        inJailUntil: jailUntil,
        mainEscortId: state.some((row) => row.gone && row.id === user.mainEscortId) ? null : undefined,
      },
    });

    for (const escort of state) {
      if (escort.gone) {
        await tx.escort.delete({ where: { id: escort.id } });
        continue;
      }
      if (hours <= 0) continue;
      await tx.escort.update({
        where: { id: escort.id },
        data: {
          loyalty: escort.loyalty,
          health: escort.health,
          windowId: escort.unassign ? null : escort.windowId,
        },
      });
    }

    for (const message of logs.slice(0, 10)) {
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
