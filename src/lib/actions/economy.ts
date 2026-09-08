"use server";

import { prisma } from "@/lib/prisma";
import { blockedReason, tickPlayer } from "@/lib/game/player";
import { BASE_ATTACK, CITIES, ITEM_AMMO, ITEM_ARMOR, ITEM_CONSUMABLE, ITEM_WEAPON, LISTING_BULLETS, LISTING_ITEM, LISTING_VEHICLE, MAX_ENERGY, MAX_HEALTH, TRAVEL_ENERGY_COST } from "@/lib/constants";
import { fail, logEvent, ok, requireUserId, revalidateGame } from "@/lib/actions/helpers";
import type { ActionResult } from "@/types/game";

export async function bankDeposit(amount: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const value = Math.floor(amount);
  if (value <= 0) return fail("Ongeldig bedrag.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < value) return fail("Niet genoeg contant geld.");

  await prisma.user.update({
    where: { id: userId },
    data: { cash: { decrement: value }, bankBalance: { increment: value } },
  });
  const message = `Je stort ${value} euro op je rekening. Geld in de bank is veiliger bij overvallen.`;
  await logEvent(userId, "BANK", message);
  return ok(message);
}

export async function bankWithdraw(amount: number): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const value = Math.floor(amount);
  if (value <= 0) return fail("Ongeldig bedrag.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.bankBalance < value) return fail("Onvoldoende saldo.");

  await prisma.user.update({
    where: { id: userId },
    data: { cash: { increment: value }, bankBalance: { decrement: value } },
  });
  const message = `Je neemt ${value} euro op.`;
  await logEvent(userId, "BANK", message);
  return ok(message);
}

export async function buyItem(itemId: string, quantity = 1): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const qty = Math.max(1, Math.min(20, Math.floor(quantity)));
  const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
  if (!item) return fail("Artikel niet gevonden.");
  if (player.rank.order < item.minRankOrder) return fail("Je rang is te laag voor dit artikel.");

  const total = item.price * qty;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.cash < total) return fail("Niet genoeg contant geld.");

  if (item.type === ITEM_AMMO) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        cash: { decrement: total },
        bullets: { increment: item.bulletsAmount * qty },
      },
    });
    const message = `Je koopt ${qty}× ${item.name} (+${item.bulletsAmount * qty} kogels).`;
    await logEvent(userId, "SHOP", message);
    return ok(message);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { cash: { decrement: total } } }),
    prisma.inventoryItem.upsert({
      where: { userId_itemId: { userId, itemId: item.id } },
      update: { quantity: { increment: qty } },
      create: { userId, itemId: item.id, quantity: qty },
    }),
  ]);
  const message = `Je koopt ${qty}× ${item.name}.`;
  await logEvent(userId, "SHOP", message);
  return ok(message);
}

export async function equipItem(itemId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");

  const owned = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId, itemId } },
    include: { item: true },
  });
  if (!owned || owned.quantity < 1) return fail("Je hebt dit item niet.");
  if (owned.item.type !== ITEM_WEAPON && owned.item.type !== ITEM_ARMOR) {
    return fail("Dit item kun je niet uitrusten.");
  }

  const data =
    owned.item.type === ITEM_WEAPON
      ? { equippedWeaponId: owned.item.id, attackPower: BASE_ATTACK + owned.item.attack }
      : { equippedArmorId: owned.item.id, defense: owned.item.defense };

  await prisma.user.update({ where: { id: userId }, data });
  return ok(`${owned.item.name} is nu uitgerust.`);
}

export async function consumeItem(itemId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");

  const owned = await prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId, itemId } },
    include: { item: true },
  });
  if (!owned || owned.quantity < 1) return fail("Je hebt dit item niet.");
  if (owned.item.type !== ITEM_CONSUMABLE) return fail("Dit is geen verbruiksartikel.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail("Speler niet gevonden.");

  const health = Math.min(MAX_HEALTH, user.health + owned.item.healAmount);
  const energy = Math.min(MAX_ENERGY, user.energy + owned.item.energyAmount);

  if (owned.quantity <= 1) {
    await prisma.inventoryItem.delete({ where: { id: owned.id } });
  } else {
    await prisma.inventoryItem.update({
      where: { id: owned.id },
      data: { quantity: { decrement: 1 } },
    });
  }
  await prisma.user.update({ where: { id: userId }, data: { health, energy } });
  return ok(`Je gebruikt ${owned.item.name}.`);
}

export async function travelTo(city: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");
  if (!CITIES.includes(city as (typeof CITIES)[number])) return fail("Onbekende stad.");
  if (player.currentCity === city) return fail("Je bent daar al.");
  if (player.energy < TRAVEL_ENERGY_COST) return fail("Niet genoeg energie om te reizen.");

  await prisma.user.update({
    where: { id: userId },
    data: { currentCity: city, energy: { decrement: TRAVEL_ENERGY_COST } },
  });
  const message = `Je reist naar ${city}.`;
  await logEvent(userId, "TRAVEL", message);
  return ok(message);
}

export async function createListing(input: {
  type: string;
  price: number;
  quantity?: number;
  vehicleId?: string;
  itemId?: string;
}): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const price = Math.floor(input.price);
  if (price < 1) return fail("Prijs moet minstens 1 euro zijn.");

  if (input.type === LISTING_BULLETS) {
    const qty = Math.floor(input.quantity ?? 0);
    if (qty < 1) return fail("Kies een aantal kogels.");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.bullets < qty) return fail("Niet genoeg kogels.");
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { bullets: { decrement: qty } } }),
      prisma.marketListing.create({
        data: { sellerId: userId, type: LISTING_BULLETS, quantity: qty, price },
      }),
    ]);
    return ok(`Je zet ${qty} kogels te koop voor ${price} euro.`);
  }

  if (input.type === LISTING_VEHICLE && input.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, userId },
      include: { vehicleType: true },
    });
    if (!vehicle) return fail("Auto niet gevonden.");
    await prisma.marketListing.create({
      data: {
        sellerId: userId,
        type: LISTING_VEHICLE,
        quantity: 1,
        price,
        vehicleId: vehicle.id,
      },
    });
    return ok(`Je zet de ${vehicle.vehicleType.name} te koop.`);
  }

  if (input.type === LISTING_ITEM && input.itemId) {
    const qty = Math.max(1, Math.floor(input.quantity ?? 1));
    const owned = await prisma.inventoryItem.findUnique({
      where: { userId_itemId: { userId, itemId: input.itemId } },
      include: { item: true },
    });
    if (!owned || owned.quantity < qty) return fail("Niet genoeg van dit item.");
    if (owned.quantity === qty) {
      await prisma.inventoryItem.delete({ where: { id: owned.id } });
    } else {
      await prisma.inventoryItem.update({
        where: { id: owned.id },
        data: { quantity: { decrement: qty } },
      });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.equippedWeaponId === owned.itemId && owned.quantity <= qty) {
      await prisma.user.update({
        where: { id: userId },
        data: { equippedWeaponId: null, attackPower: BASE_ATTACK },
      });
    }
    if (user?.equippedArmorId === owned.itemId && owned.quantity <= qty) {
      await prisma.user.update({
        where: { id: userId },
        data: { equippedArmorId: null, defense: 0 },
      });
    }
    await prisma.marketListing.create({
      data: {
        sellerId: userId,
        type: LISTING_ITEM,
        quantity: qty,
        price,
        itemId: owned.itemId,
      },
    });
    return ok(`Je zet ${qty}× ${owned.item.name} te koop.`);
  }

  return fail("Ongeldige advertentie.");
}

export async function buyListing(listingId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");
  const player = await tickPlayer(userId);
  if (!player) return fail("Speler niet gevonden.");
  const blocked = blockedReason(player);
  if (blocked) return fail(blocked, "warning");

  const listing = await prisma.marketListing.findUnique({
    where: { id: listingId },
    include: { vehicle: { include: { vehicleType: true } }, item: true, seller: true },
  });
  if (!listing || !listing.active) return fail("Advertentie is niet meer actief.");
  if (listing.sellerId === userId) return fail("Je kunt je eigen advertentie niet kopen.");

  const buyer = await prisma.user.findUnique({ where: { id: userId } });
  if (!buyer || buyer.cash < listing.price) return fail("Niet genoeg contant geld.");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { cash: { decrement: listing.price } },
    });
    await tx.user.update({
      where: { id: listing.sellerId },
      data: { cash: { increment: listing.price } },
    });
    await tx.marketListing.update({ where: { id: listing.id }, data: { active: false } });

    if (listing.type === LISTING_BULLETS) {
      await tx.user.update({
        where: { id: userId },
        data: { bullets: { increment: listing.quantity } },
      });
    }
    if (listing.type === LISTING_VEHICLE && listing.vehicleId) {
      await tx.vehicle.update({
        where: { id: listing.vehicleId },
        data: { userId },
      });
    }
    if (listing.type === LISTING_ITEM && listing.itemId) {
      await tx.inventoryItem.upsert({
        where: { userId_itemId: { userId, itemId: listing.itemId } },
        update: { quantity: { increment: listing.quantity } },
        create: { userId, itemId: listing.itemId, quantity: listing.quantity },
      });
    }
  });

  const label =
    listing.type === LISTING_BULLETS
      ? `${listing.quantity} kogels`
      : listing.vehicle?.vehicleType.name ?? listing.item?.name ?? "artikel";
  const message = `Je koopt ${label} van ${listing.seller.username} voor ${listing.price} euro.`;
  await logEvent(userId, "MARKET", message);
  return ok(message);
}

export async function cancelListing(listingId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return fail("Je bent niet ingelogd.");

  const listing = await prisma.marketListing.findFirst({
    where: { id: listingId, sellerId: userId, active: true },
  });
  if (!listing) return fail("Advertentie niet gevonden.");

  await prisma.$transaction(async (tx) => {
    await tx.marketListing.update({ where: { id: listing.id }, data: { active: false } });
    if (listing.type === LISTING_BULLETS) {
      await tx.user.update({
        where: { id: userId },
        data: { bullets: { increment: listing.quantity } },
      });
    }
    if (listing.type === LISTING_ITEM && listing.itemId) {
      await tx.inventoryItem.upsert({
        where: { userId_itemId: { userId, itemId: listing.itemId } },
        update: { quantity: { increment: listing.quantity } },
        create: { userId, itemId: listing.itemId, quantity: listing.quantity },
      });
    }
  });
  return ok("Advertentie ingetrokken.");
}

export async function bankForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const op = String(formData.get("op") ?? "deposit");
  const amount = Number(formData.get("amount") ?? 0);
  let result;
  if (op === "withdraw") result = await bankWithdraw(amount);
  else if (op === "all") {
    const userId = await requireUserId();
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    result = await bankDeposit(user?.cash ?? 0);
  } else result = await bankDeposit(amount);
  revalidateGame();
  return result;
}

export async function buyItemForm(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await buyItem(String(formData.get("itemId") ?? ""), 1);
  revalidateGame();
  return result;
}
