import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

import { CRIMES } from "../src/lib/crime-catalog";
import { PLAYER_RANKS } from "../src/lib/ranks";
import { SHOP_ITEMS } from "../src/lib/shop-catalog";
import { VEHICLES } from "../src/lib/vehicle-catalog";

const prisma = new PrismaClient();

const ranks = PLAYER_RANKS.map((rank) => ({ ...rank }));

const crimes = CRIMES;
const vehicleTypes = VEHICLES;

const shopItems = SHOP_ITEMS;

async function upsertCatalog() {
  for (const crime of crimes) {
    await prisma.crime.upsert({
      where: { slug: crime.slug },
      create: crime,
      update: crime,
    });
  }
  for (const vehicle of vehicleTypes) {
    await prisma.vehicleType.upsert({
      where: { slug: vehicle.slug },
      create: vehicle,
      update: vehicle,
    });
  }
  for (const item of shopItems) {
    await prisma.shopItem.upsert({
      where: { slug: item.slug },
      create: item,
      update: item,
    });
  }
}

async function main() {
  const existingRanks = await prisma.rank.count();
  if (existingRanks > 0 && process.env.FORCE_SEED !== "1") {
    await upsertCatalog();
    console.log("Catalog upserted (non-destructive). New crimes and vehicle types are available.");
    return;
  }

  await prisma.attackLog.deleteMany();
  await prisma.gameLog.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.shoutboxMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.marketListing.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.user.updateMany({ data: { familyId: null, equippedWeaponId: null, equippedArmorId: null } });
  await prisma.family.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shopItem.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.crime.deleteMany();
  await prisma.rank.deleteMany();

  await prisma.rank.createMany({ data: ranks });
  await prisma.crime.createMany({ data: crimes });
  await prisma.vehicleType.createMany({ data: vehicleTypes });
  await prisma.shopItem.createMany({ data: shopItems });

  if (process.env.SKIP_DEMO_USERS === "1") {
    console.log("Seed klaar (catalog only; SKIP_DEMO_USERS=1).");
    return;
  }

  const allRanks = await prisma.rank.findMany();
  const rankByOrder = Object.fromEntries(allRanks.map((r) => [r.order, r]));
  const password = hashSync("demo1234", 10);

  const demo = await prisma.user.create({
    data: {
      email: "demo@onderwereld.nl",
      hashedPassword: password,
      username: "DonDemo",
      cash: 8500,
      bankBalance: 2000,
      bullets: 80,
      exp: 120,
      rankId: rankByOrder[1].id,
      currentCity: "ams",
      attackPower: 5,
    },
  });

  const rivals = [
    { email: "nachtjager@onderwereld.nl", username: "DeNachtjager", city: "lon", exp: 900, cash: 1400, bullets: 40, health: 100 },
    { email: "bloedhond@onderwereld.nl", username: "Bloedhond", city: "ams", exp: 2200, cash: 3200, bullets: 25, health: 85 },
    { email: "sjaak@onderwereld.nl", username: "SilentSjaak", city: "rom", exp: 5200, cash: 900, bullets: 120, health: 100 },
    { email: "kira@onderwereld.nl", username: "KiraVanZuid", city: "nyc", exp: 400, cash: 600, bullets: 10, health: 100 },
  ];

  const createdRivals = [];
  for (const rival of rivals) {
    const rank = [...allRanks].reverse().find((r) => rival.exp >= r.minExp) ?? rankByOrder[1];
    createdRivals.push(
      await prisma.user.create({
        data: {
          email: rival.email,
          hashedPassword: password,
          username: rival.username,
          cash: rival.cash,
          bullets: rival.bullets,
          exp: rival.exp,
          health: rival.health,
          rankId: rank.id,
          currentCity: rival.city,
        },
      }),
    );
  }

  const knuppel = await prisma.shopItem.findUnique({ where: { slug: "knuppel" } });
  const jas = await prisma.shopItem.findUnique({ where: { slug: "jas" } });
  const verband = await prisma.shopItem.findUnique({ where: { slug: "verband" } });
  const golf = await prisma.vehicleType.findUnique({ where: { slug: "golf" } });

  if (knuppel && jas && verband) {
    await prisma.inventoryItem.createMany({
      data: [
        { userId: demo.id, itemId: knuppel.id, quantity: 1 },
        { userId: demo.id, itemId: jas.id, quantity: 1 },
        { userId: demo.id, itemId: verband.id, quantity: 2 },
      ],
    });
    await prisma.user.update({
      where: { id: demo.id },
      data: {
        equippedWeaponId: knuppel.id,
        equippedArmorId: jas.id,
        attackPower: 5 + knuppel.attack,
        defense: jas.defense,
      },
    });
  }

  if (golf) {
    await prisma.vehicle.create({
      data: { userId: demo.id, vehicleTypeId: golf.id, condition: 72 },
    });
  }

  await prisma.message.create({
    data: {
      fromUserId: createdRivals[0].id,
      toUserId: demo.id,
      subject: "Welkom in de straat",
      body: "Nieuwe hond in Amsterdam? Blijf uit de haven, of kom langs als je kogels over hebt.",
    },
  });

  await prisma.shoutboxMessage.createMany({
    data: [
      { userId: createdRivals[3].id, body: "Iemand kogels over in Utrecht?" },
      { userId: createdRivals[0].id, body: "De nacht is van ons. Rotterdam is open." },
      { userId: demo.id, body: "DonDemo is in de stad. Respect of kogels — kies maar." },
    ],
  });

  await prisma.gameLog.create({
    data: {
      userId: demo.id,
      type: "SYSTEM",
      message: "Je bent aangekomen in Amsterdam. De onderwereld wacht.",
    },
  });

  console.log("Seed klaar. Demo: demo@onderwereld.nl / demo1234 (DonDemo)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
