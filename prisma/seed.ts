import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

const ranks = [
  { slug: "schooier", name: "Schooier", minExp: 0, order: 1 },
  { slug: "zakkenroller", name: "Zakkenroller", minExp: 250, order: 2 },
  { slug: "inbreker", name: "Inbreker", minExp: 800, order: 3 },
  { slug: "overvaller", name: "Overvaller", minExp: 2000, order: 4 },
  { slug: "schutter", name: "Schutter", minExp: 5000, order: 5 },
  { slug: "huurmoordenaar", name: "Huurmoordenaar", minExp: 12000, order: 6 },
  { slug: "capo", name: "Capo", minExp: 25000, order: 7 },
  { slug: "consigliere", name: "Consigliere", minExp: 50000, order: 8 },
  { slug: "onderbaas", name: "Onderbaas", minExp: 100000, order: 9 },
  { slug: "peetvader", name: "Peetvader", minExp: 200000, order: 10 },
];

const crimes = [
  {
    slug: "portemonnee",
    name: "Portemonnee stelen",
    description: "Licht iemand op straat op. Snel, vuil, en goed voor beginners.",
    minRankOrder: 1,
    successChance: 78,
    cashMin: 15,
    cashMax: 45,
    expReward: 8,
    energyCost: 6,
    jailRiskChance: 12,
    jailMinutes: 4,
    cooldownSeconds: 20,
  },
  {
    slug: "fiets",
    name: "Fiets stelen",
    description: "Een onbeheerde fiets bij het station. Klassiek Nederlands.",
    minRankOrder: 1,
    successChance: 72,
    cashMin: 30,
    cashMax: 80,
    expReward: 14,
    energyCost: 8,
    jailRiskChance: 16,
    jailMinutes: 6,
    cooldownSeconds: 25,
  },
  {
    slug: "winkel",
    name: "Winkel overvallen",
    description: "Een avondwinkel met een dunne kassa en een nog dunnere beveiliging.",
    minRankOrder: 2,
    successChance: 62,
    cashMin: 90,
    cashMax: 220,
    expReward: 32,
    energyCost: 14,
    jailRiskChance: 24,
    jailMinutes: 12,
    cooldownSeconds: 30,
  },
  {
    slug: "inbraak",
    name: "Woninginbraak",
    description: "Wacht tot de lichten uitgaan. Sieraden, laptops, contant geld.",
    minRankOrder: 3,
    successChance: 55,
    cashMin: 160,
    cashMax: 380,
    expReward: 50,
    energyCost: 18,
    jailRiskChance: 28,
    jailMinutes: 18,
    cooldownSeconds: 35,
  },
  {
    slug: "koerier",
    name: "Drugskoerier",
    description: "Een tasje van A naar B. Vraag niet wat erin zit.",
    minRankOrder: 3,
    successChance: 50,
    cashMin: 220,
    cashMax: 520,
    expReward: 65,
    energyCost: 22,
    jailRiskChance: 32,
    jailMinutes: 25,
    cooldownSeconds: 40,
  },
  {
    slug: "juwelier",
    name: "Juwelier overvallen",
    description: "Hamers, vitrines en 90 seconden voordat de sirenes komen.",
    minRankOrder: 4,
    successChance: 42,
    cashMin: 450,
    cashMax: 980,
    expReward: 95,
    energyCost: 28,
    jailRiskChance: 36,
    jailMinutes: 35,
    cooldownSeconds: 45,
  },
  {
    slug: "bankauto",
    name: "Bankauto beroven",
    description: "Twee man, een busje, en een route die je uit je hoofd kent.",
    minRankOrder: 5,
    successChance: 34,
    cashMin: 900,
    cashMax: 2100,
    expReward: 150,
    energyCost: 38,
    jailRiskChance: 42,
    jailMinutes: 50,
    cooldownSeconds: 55,
  },
  {
    slug: "casino",
    name: "Casino beroven",
    description: "Camera's, kooien en een kluis vol nachtelijk verlies.",
    minRankOrder: 6,
    successChance: 26,
    cashMin: 1800,
    cashMax: 4200,
    expReward: 240,
    energyCost: 50,
    jailRiskChance: 48,
    jailMinutes: 75,
    cooldownSeconds: 70,
  },
  {
    slug: "transport",
    name: "Waardetransport",
    description: "Gepantserde deuren. Als het lukt, ben je weken zoet.",
    minRankOrder: 8,
    successChance: 18,
    cashMin: 4500,
    cashMax: 9800,
    expReward: 420,
    energyCost: 70,
    jailRiskChance: 55,
    jailMinutes: 110,
    cooldownSeconds: 90,
  },
  {
    slug: "parlement",
    name: "Ministerieel konvooi",
    description: "Alleen voor peetvaders. Eén fout en je verdwijnt jaren.",
    minRankOrder: 10,
    successChance: 12,
    cashMin: 12000,
    cashMax: 28000,
    expReward: 850,
    energyCost: 90,
    jailRiskChance: 62,
    jailMinutes: 180,
    cooldownSeconds: 120,
  },
  {
    slug: "pinautomaat",
    name: "Pinautomaat kraken",
    description: "Een nachtelijke skimmer en een boor. Klein geld, snel wegwezen.",
    minRankOrder: 2,
    successChance: 64,
    cashMin: 70,
    cashMax: 160,
    expReward: 24,
    energyCost: 12,
    jailRiskChance: 20,
    jailMinutes: 10,
    cooldownSeconds: 28,
  },
  {
    slug: "container",
    name: "Havencontainer leeghalen",
    description: "Een zegel knippen in de nacht. Elektronica, sigaretten, of pech.",
    minRankOrder: 4,
    successChance: 40,
    cashMin: 380,
    cashMax: 860,
    expReward: 88,
    energyCost: 26,
    jailRiskChance: 34,
    jailMinutes: 32,
    cooldownSeconds: 42,
  },
  {
    slug: "afpersing",
    name: "Beschermingsgeld innen",
    description: "Een rondje langs de zaakjes. Respect kost, weigeren kost meer.",
    minRankOrder: 5,
    successChance: 38,
    cashMin: 700,
    cashMax: 1600,
    expReward: 130,
    energyCost: 32,
    jailRiskChance: 38,
    jailMinutes: 40,
    cooldownSeconds: 50,
  },
  {
    slug: "museum",
    name: "Museumroof",
    description: "Alarm, glas, en één schilderij dat de hele nacht waard is.",
    minRankOrder: 7,
    successChance: 22,
    cashMin: 2800,
    cashMax: 6400,
    expReward: 310,
    energyCost: 58,
    jailRiskChance: 50,
    jailMinutes: 90,
    cooldownSeconds: 80,
  },
  {
    slug: "arsenaal",
    name: "Legerarsenaal",
    description: "Een depot buiten de stad. Alleen voor wie het leger durft te krenken.",
    minRankOrder: 9,
    successChance: 14,
    cashMin: 8000,
    cashMax: 18000,
    expReward: 620,
    energyCost: 82,
    jailRiskChance: 58,
    jailMinutes: 140,
    cooldownSeconds: 105,
  },
];

const vehicleTypes = [
  { slug: "fiets", name: "Stadsfiets", baseValue: 80, stealDifficulty: 12, rarity: "common", minRankOrder: 1 },
  { slug: "scooter", name: "Vespa", baseValue: 650, stealDifficulty: 22, rarity: "common", minRankOrder: 1 },
  { slug: "golf", name: "Volkswagen Golf", baseValue: 3200, stealDifficulty: 34, rarity: "uncommon", minRankOrder: 2 },
  { slug: "bmw", name: "BMW 3-serie", baseValue: 9800, stealDifficulty: 48, rarity: "uncommon", minRankOrder: 3 },
  { slug: "mercedes", name: "Mercedes S-Klasse", baseValue: 22000, stealDifficulty: 62, rarity: "rare", minRankOrder: 5 },
  { slug: "porsche", name: "Porsche 911", baseValue: 48000, stealDifficulty: 78, rarity: "rare", minRankOrder: 6 },
  { slug: "lambo", name: "Lamborghini Huracán", baseValue: 110000, stealDifficulty: 90, rarity: "legendary", minRankOrder: 8 },
  { slug: "corsa", name: "Opel Corsa", baseValue: 420, stealDifficulty: 18, rarity: "common", minRankOrder: 1 },
  { slug: "rs6", name: "Audi RS6", baseValue: 14500, stealDifficulty: 52, rarity: "uncommon", minRankOrder: 4 },
  { slug: "rover", name: "Range Rover Sport", baseValue: 28000, stealDifficulty: 58, rarity: "rare", minRankOrder: 5 },
  { slug: "roma", name: "Ferrari Roma", baseValue: 72000, stealDifficulty: 82, rarity: "rare", minRankOrder: 7 },
  { slug: "chiron", name: "Bugatti Chiron", baseValue: 185000, stealDifficulty: 96, rarity: "legendary", minRankOrder: 9 },
];

const shopItems = [
  { slug: "knuppel", name: "Honkbalknuppel", description: "Hout en intentie. Meer niet.", type: "WEAPON", attack: 8, defense: 0, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 250, minRankOrder: 1 },
  { slug: "mes", name: "Stiletto", description: "Klein, stil, en altijd binnen handbereik.", type: "WEAPON", attack: 15, defense: 0, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 750, minRankOrder: 1 },
  { slug: "pistool", name: "Glock 17", description: "Standaard straatvuur. Betrouwbaar.", type: "WEAPON", attack: 28, defense: 0, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 2800, minRankOrder: 2 },
  { slug: "uzi", name: "Uzi", description: "Spray and pray, Rotterdam-stijl.", type: "WEAPON", attack: 46, defense: 0, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 8500, minRankOrder: 4 },
  { slug: "ak", name: "AK-47", description: "Als onderhandelen klaar is.", type: "WEAPON", attack: 70, defense: 0, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 22000, minRankOrder: 6 },
  { slug: "sniper", name: "Barrett M82", description: "Eén schot. Eén rekening.", type: "WEAPON", attack: 95, defense: 0, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 55000, minRankOrder: 8 },
  { slug: "jas", name: "Leren jas", description: "Houdt messen tegen. Kogels minder.", type: "ARMOR", attack: 0, defense: 8, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 400, minRankOrder: 1 },
  { slug: "vest", name: "Kogelvrij vest", description: "Standaard bescherming voor wie vijanden maakt.", type: "ARMOR", attack: 0, defense: 22, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 3200, minRankOrder: 3 },
  { slug: "harnas", name: "Tactisch harnas", description: "Zwaar, warm, en het verschil tussen leven en ziekenhuis.", type: "ARMOR", attack: 0, defense: 40, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 14000, minRankOrder: 5 },
  { slug: "titanium", name: "Titaniumvest", description: "Bijna oneerlijk. Precies zoals het hoort.", type: "ARMOR", attack: 0, defense: 65, healAmount: 0, energyAmount: 0, bulletsAmount: 0, price: 38000, minRankOrder: 7 },
  { slug: "verband", name: "EHBO-verband", description: "Heelt 30 gezondheid. Geen wonderen.", type: "CONSUMABLE", attack: 0, defense: 0, healAmount: 30, energyAmount: 0, bulletsAmount: 0, price: 180, minRankOrder: 1 },
  { slug: "energiedrank", name: "Energiedrank", description: "Twijfelachtige smaak, +40 energie.", type: "CONSUMABLE", attack: 0, defense: 0, healAmount: 0, energyAmount: 40, bulletsAmount: 0, price: 220, minRankOrder: 1 },
  { slug: "kogels50", name: "Doos kogels (50)", description: "Vijftig patronen. Niet vragen waar ze vandaan komen.", type: "AMMO", attack: 0, defense: 0, healAmount: 0, energyAmount: 0, bulletsAmount: 50, price: 600, minRankOrder: 2 },
  { slug: "kogels200", name: "Krat kogels (200)", description: "Voor als het serieus wordt.", type: "AMMO", attack: 0, defense: 0, healAmount: 0, energyAmount: 0, bulletsAmount: 200, price: 2100, minRankOrder: 4 },
];

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
