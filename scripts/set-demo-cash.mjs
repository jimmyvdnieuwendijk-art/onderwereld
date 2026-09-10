/**
 * One-shot: SET DonDemo cash to 500000. Touches only that user.
 *
 *   DATABASE_URL="postgresql://…" node scripts/set-demo-cash.mjs
 *
 * SQL equivalent:
 *   UPDATE "User" SET cash = 500000
 *   WHERE lower(email) = 'demo@onderwereld.nl' OR lower(username) = 'dondemo';
 */
import { PrismaClient } from "@prisma/client";

const DEMO_CASH = 500_000;
const prisma = new PrismaClient();

const byEmail = await prisma.user.findUnique({
  where: { email: "demo@onderwereld.nl" },
  select: { id: true, cash: true, username: true, email: true },
});
const demo =
  byEmail ??
  (await prisma.user.findFirst({
    where: { username: { equals: "DonDemo", mode: "insensitive" } },
    select: { id: true, cash: true, username: true, email: true },
  }));

if (!demo) {
  console.error("DonDemo / demo@onderwereld.nl niet gevonden.");
  await prisma.$disconnect();
  process.exit(1);
}

const updated = await prisma.user.update({
  where: { id: demo.id },
  data: { cash: DEMO_CASH },
  select: { username: true, email: true, cash: true },
});
console.log(`OK ${updated.username} <${updated.email}> cash=${updated.cash} (was ${demo.cash})`);
await prisma.$disconnect();
