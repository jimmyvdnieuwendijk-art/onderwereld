import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACHIEVEMENTS,
  type AchievementDef,
  type AchievementMetric,
  isCatalogNameColor,
  isCatalogTitle,
} from "@/lib/achievement-catalog";
import { normalizeNameColor } from "@/lib/player-name";

export type AchievementBoardItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: AchievementDef["difficulty"];
  metric: AchievementMetric;
  target: number;
  progress: number;
  claimed: boolean;
  completed: boolean;
  rewardExp: number;
  rewardPimpExp: number;
  rewardGymExp: number;
  rewardCash: number;
  rewardBullets: number;
  rewardTitle: string | null;
  rewardNameColor: string | null;
};

export type ClaimedAchievementItem = {
  title: string;
  rewardTitle: string | null;
  rewardNameColor: string | null;
};

export type AchievementBoard = {
  items: AchievementBoardItem[];
  claimable: number;
  selectedTitle: string | null;
  selectedNameColor: string | null;
  unlockedTitles: string[];
  unlockedNameColors: string[];
};

type MetricSource = {
  crimeSuccessCount: number;
  cash: number;
  cashEarned: number;
  travelCount: number;
  gymSessionCount: number;
  gymExp: number;
  pimpExp: number;
  workerCount: number;
  killCount: number;
  loginCount: number;
  exp: number;
  vehicleCount: number;
  inFamily: boolean;
  bullets: number;
};

function metricValue(metric: AchievementMetric, src: MetricSource) {
  switch (metric) {
    case "CRIMES":
      return src.crimeSuccessCount;
    case "CASH":
      return src.cash;
    case "CASH_EARNED":
      return src.cashEarned;
    case "TRAVEL":
      return src.travelCount;
    case "GYM":
      return src.gymSessionCount;
    case "GYM_EXP":
      return src.gymExp;
    case "HOEREN":
      return src.pimpExp;
    case "WORKERS":
      return src.workerCount;
    case "KILLS":
      return src.killCount;
    case "LOGINS":
      return src.loginCount;
    case "EXP":
      return src.exp;
    case "VEHICLES":
      return src.vehicleCount;
    case "FAMILY":
      return src.inFamily ? 1 : 0;
    case "BULLETS":
      return src.bullets;
  }
}

async function loadMetricSource(userId: string): Promise<MetricSource | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      crimeSuccessCount: true,
      cash: true,
      cashEarned: true,
      travelCount: true,
      gymSessionCount: true,
      gymExp: true,
      pimpExp: true,
      killCount: true,
      loginCount: true,
      exp: true,
      bullets: true,
      familyId: true,
      _count: { select: { vehicles: true, escorts: true } },
    },
  });
  if (!user) return null;
  return {
    crimeSuccessCount: user.crimeSuccessCount,
    cash: user.cash,
    cashEarned: user.cashEarned,
    travelCount: user.travelCount,
    gymSessionCount: user.gymSessionCount,
    gymExp: user.gymExp,
    pimpExp: user.pimpExp,
    workerCount: user._count.escorts,
    killCount: user.killCount,
    loginCount: user.loginCount,
    exp: user.exp,
    vehicleCount: user._count.vehicles,
    inFamily: Boolean(user.familyId),
    bullets: user.bullets,
  };
}

let achievementSync: Promise<void> | null = null;

export async function ensureAchievements() {
  if (!achievementSync) {
    achievementSync = (async () => {
      await Promise.all(
        ACHIEVEMENTS.map((row) =>
          prisma.achievement.upsert({
            where: { slug: row.slug },
            create: row,
            update: {
              title: row.title,
              description: row.description,
              difficulty: row.difficulty,
              metric: row.metric,
              target: row.target,
              rewardExp: row.rewardExp,
              rewardPimpExp: row.rewardPimpExp,
              rewardGymExp: row.rewardGymExp,
              rewardCash: row.rewardCash,
              rewardBullets: row.rewardBullets,
              rewardTitle: row.rewardTitle,
              rewardNameColor: row.rewardNameColor,
              sortOrder: row.sortOrder,
            },
          }),
        ),
      );
    })().catch((error) => {
      achievementSync = null;
      throw error;
    });
  }
  await achievementSync;
}

export async function syncAchievementProgress(userId: string) {
  const [src, defs] = await Promise.all([
    loadMetricSource(userId),
    prisma.achievement.findMany({
      select: { id: true, slug: true, metric: true, target: true },
    }),
  ]);
  if (!src || defs.length === 0) return;

  const existing = await prisma.playerAchievement.findMany({
    where: { userId },
    select: { achievementId: true, progress: true },
  });
  const byId = new Map(existing.map((row) => [row.achievementId, row.progress]));

  const creates: { userId: string; achievementId: string; progress: number }[] = [];
  const updates: { achievementId: string; progress: number }[] = [];

  for (const def of defs) {
    const metric = def.metric as AchievementMetric;
    const next = Math.min(def.target, Math.max(0, metricValue(metric, src)));
    const prev = byId.get(def.id);
    if (prev == null) {
      creates.push({ userId, achievementId: def.id, progress: next });
    } else if (next > prev) {
      updates.push({ achievementId: def.id, progress: next });
    }
  }

  if (creates.length > 0) {
    await prisma.playerAchievement.createMany({ data: creates, skipDuplicates: true });
  }
  if (updates.length > 0) {
    await Promise.all(
      updates.map((row) =>
        prisma.playerAchievement.update({
          where: { userId_achievementId: { userId, achievementId: row.achievementId } },
          data: { progress: row.progress },
        }),
      ),
    );
  }
}

export function queueAchievementSync(userId: string) {
  const run = () => {
    void syncAchievementProgress(userId).catch(() => undefined);
  };
  try {
    after(run);
  } catch {
    run();
  }
}

export async function listAchievementBoard(userId: string): Promise<AchievementBoard | null> {
  await ensureAchievements();
  await syncAchievementProgress(userId);

  const [user, defs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        selectedTitle: true,
        selectedNameColor: true,
        unlockedTitles: true,
        unlockedNameColors: true,
      },
    }),
    prisma.achievement.findMany({ orderBy: [{ sortOrder: "asc" }, { target: "asc" }] }),
  ]);
  if (!user) return null;

  const progressRows = await prisma.playerAchievement.findMany({
    where: { userId },
    select: { achievementId: true, progress: true, claimedAt: true },
  });
  const progressById = new Map(progressRows.map((row) => [row.achievementId, row]));

  const items: AchievementBoardItem[] = defs.map((def) => {
    const row = progressById.get(def.id);
    const progress = row?.progress ?? 0;
    const claimed = Boolean(row?.claimedAt);
    return {
      id: def.id,
      slug: def.slug,
      title: def.title,
      description: def.description,
      difficulty: def.difficulty as AchievementDef["difficulty"],
      metric: def.metric as AchievementMetric,
      target: def.target,
      progress: Math.min(def.target, progress),
      claimed,
      completed: progress >= def.target,
      rewardExp: def.rewardExp,
      rewardPimpExp: def.rewardPimpExp,
      rewardGymExp: def.rewardGymExp,
      rewardCash: def.rewardCash,
      rewardBullets: def.rewardBullets,
      rewardTitle: def.rewardTitle,
      rewardNameColor: def.rewardNameColor,
    };
  });

  return {
    items,
    claimable: items.filter((row) => row.completed && !row.claimed).length,
    selectedTitle: user.selectedTitle,
    selectedNameColor: normalizeNameColor(user.selectedNameColor),
    unlockedTitles: user.unlockedTitles,
    unlockedNameColors: user.unlockedNameColors.map((hex) => hex.toLowerCase()),
  };
}

function mergeUnlocks(current: string[], extra: string | null | undefined) {
  if (!extra) return current;
  if (current.includes(extra)) return current;
  return [...current, extra];
}

export async function claimAchievements(userId: string, ids: string[] | "all") {
  await ensureAchievements();
  await syncAchievementProgress(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      unlockedTitles: true,
      unlockedNameColors: true,
      selectedTitle: true,
      selectedNameColor: true,
    },
  });
  if (!user) return { claimed: 0, titles: [] as string[], colors: [] as string[], items: [] as ClaimedAchievementItem[] };

  const rows = await prisma.playerAchievement.findMany({
    where: {
      userId,
      claimedAt: null,
      ...(ids === "all" ? {} : { achievementId: { in: ids } }),
    },
    include: { achievement: true },
    orderBy: { achievement: { sortOrder: "asc" } },
  });

  const ready = rows.filter((row) => row.progress >= row.achievement.target);
  if (ready.length === 0) {
    return { claimed: 0, titles: [] as string[], colors: [] as string[], items: [] as ClaimedAchievementItem[] };
  }

  let rewardExp = 0;
  let rewardPimpExp = 0;
  let rewardGymExp = 0;
  let rewardCash = 0;
  let rewardBullets = 0;
  let titles = user.unlockedTitles;
  let colors = user.unlockedNameColors.map((hex) => hex.toLowerCase());
  const unlockedNowTitles: string[] = [];
  const unlockedNowColors: string[] = [];

  for (const row of ready) {
    const def = row.achievement;
    rewardExp += def.rewardExp;
    rewardPimpExp += def.rewardPimpExp;
    rewardGymExp += def.rewardGymExp;
    rewardCash += def.rewardCash;
    rewardBullets += def.rewardBullets;
    if (def.rewardTitle && isCatalogTitle(def.rewardTitle) && !titles.includes(def.rewardTitle)) {
      titles = mergeUnlocks(titles, def.rewardTitle);
      unlockedNowTitles.push(def.rewardTitle);
    }
    const color = normalizeNameColor(def.rewardNameColor);
    if (color && isCatalogNameColor(color) && !colors.includes(color)) {
      colors = mergeUnlocks(colors, color);
      unlockedNowColors.push(color);
    }
  }

  const now = new Date();
  await prisma.$transaction([
    ...ready.map((row) =>
      prisma.playerAchievement.update({
        where: { id: row.id },
        data: { claimedAt: now, progress: row.achievement.target },
      }),
    ),
    prisma.user.update({
      where: { id: userId },
      data: {
        ...(rewardExp > 0 ? { exp: { increment: rewardExp } } : {}),
        ...(rewardPimpExp > 0 ? { pimpExp: { increment: rewardPimpExp } } : {}),
        ...(rewardGymExp > 0 ? { gymExp: { increment: rewardGymExp } } : {}),
        ...(rewardCash > 0 ? { cash: { increment: rewardCash } } : {}),
        ...(rewardBullets > 0 ? { bullets: { increment: rewardBullets } } : {}),
        unlockedTitles: titles,
        unlockedNameColors: colors,
      },
    }),
  ]);

  return {
    claimed: ready.length,
    titles: unlockedNowTitles,
    colors: unlockedNowColors,
    items: ready.map((row) => ({
      title: row.achievement.title,
      rewardTitle: row.achievement.rewardTitle,
      rewardNameColor: row.achievement.rewardNameColor,
    })),
  };
}
