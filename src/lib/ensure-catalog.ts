import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureRankLadder } from "@/lib/ensure-ranks";
import { CRIMES } from "@/lib/crime-catalog";
import { SHOP_ITEMS } from "@/lib/shop-catalog";
import { VEHICLES } from "@/lib/vehicle-catalog";
import { ensureAchievements } from "@/lib/achievements";

/** Exact cash for the shared DonDemo test account. */
export const DEMO_TEST_CASH = 500_000;
export const DEMO_EMAIL = "demo@onderwereld.nl";
export const DEMO_USERNAME = "DonDemo";
export const DEMO_PASSWORD = "demo1234";

type DemoRow = {
  id: string;
  cash: number;
  username: string;
  email: string;
};

async function findDemoUser() {
  const byEmail = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, cash: true, username: true, email: true },
  });
  return (
    byEmail ??
    (await prisma.user.findFirst({
      where: { username: { equals: DEMO_USERNAME, mode: "insensitive" } },
      select: { id: true, cash: true, username: true, email: true },
    }))
  );
}

/**
 * Cash helper only. Never touches hashedPassword, TOTP, email, or session.
 * Existing DonDemo credentials always win.
 */
export async function grantDemoTestCash(): Promise<DemoRow | null> {
  const demo = await findDemoUser();
  if (!demo) return null;
  if (demo.cash === DEMO_TEST_CASH) return demo;
  return prisma.user.update({
    where: { id: demo.id },
    data: { cash: DEMO_TEST_CASH },
    select: { id: true, cash: true, username: true, email: true },
  });
}

let catalogSync: Promise<void> | null = null;
let liveBoot: Promise<void> | null = null;

/** Always upsert shop/crime/vehicle numbers so live deploys pick up balance changes without a wipe. */
export async function ensureGameCatalog() {
  if (!catalogSync) {
    catalogSync = (async () => {
      for (const item of SHOP_ITEMS) {
        await prisma.shopItem.upsert({
          where: { slug: item.slug },
          create: { ...item },
          update: { ...item },
        });
      }
      for (const crime of CRIMES) {
        await prisma.crime.upsert({
          where: { slug: crime.slug },
          create: { ...crime },
          update: { ...crime },
        });
      }
      for (const vehicle of VEHICLES) {
        await prisma.vehicleType.upsert({
          where: { slug: vehicle.slug },
          create: { ...vehicle },
          update: { ...vehicle },
        });
      }
      await ensureAchievements();
    })().catch((error) => {
      catalogSync = null;
      console.error("ensureGameCatalog", error);
    });
  }
  await catalogSync;
}

/** Non-destructive: ranks, extra catalog, demo user. Never deletes live players. */
export async function ensureLiveBootstrap() {
  if (!liveBoot) {
    liveBoot = (async () => {
      await ensureRankLadder();
      await ensureGameCatalog();
      if (process.env.SKIP_DEMO_USERS === "1") return;

      const existing = await findDemoUser();
      if (existing) return;

      const nameTaken = await prisma.user.findFirst({
        where: { username: { equals: DEMO_USERNAME, mode: "insensitive" } },
        select: { id: true },
      });
      if (nameTaken) return;

      const starter = await prisma.rank.findFirst({ orderBy: { order: "asc" } });
      if (!starter) return;

      const hashedPassword = await hash(DEMO_PASSWORD, 10);
      await prisma.user.create({
        data: {
          email: DEMO_EMAIL,
          hashedPassword,
          username: DEMO_USERNAME,
          currentCity: "ams",
          cash: DEMO_TEST_CASH,
          rankId: starter.id,
        },
      });
    })().catch((error) => {
      liveBoot = null;
      console.error("ensureLiveBootstrap", error);
    });
  }
  await liveBoot;
}
