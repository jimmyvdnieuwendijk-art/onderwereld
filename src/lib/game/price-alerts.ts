import { prisma } from "@/lib/prisma";
import { SMUGGLE_GOODS, cityDisplayName, smugglePrice, type SmuggleGood } from "@/lib/airports";

function isGood(value: string): value is SmuggleGood {
  return value === "drugs" || value === "weapons" || value === "bullets";
}

function goodLabel(good: SmuggleGood) {
  return SMUGGLE_GOODS.find((row) => row.id === good)?.label.toLowerCase() ?? good;
}

export async function firePriceAlerts(userId: string, cityId: string) {
  const alerts = await prisma.priceAlert.findMany({ where: { userId } });
  if (alerts.length === 0) return 0;

  let fired = 0;
  for (const alert of alerts) {
    if (!isGood(alert.good)) continue;

    const cityOk = !alert.cityId || alert.cityId === cityId;
    const price = smugglePrice(cityId, alert.good, alert.side === "sell" ? "sell" : "buy");
    const hit =
      cityOk && (alert.side === "sell" ? price >= alert.threshold : price <= alert.threshold);

    if (!hit) {
      if (alert.lastFiredCity && alert.lastFiredCity !== cityId) {
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { lastFiredCity: null },
        });
      }
      continue;
    }
    if (alert.lastFiredCity === cityId) continue;

    const city = cityDisplayName(cityId);
    const label = goodLabel(alert.good);
    const sideLabel = alert.side === "sell" ? "verkoopprijs" : "koopprijs";
    const message = `Prijsalert: ${label} in ${city} — ${sideLabel} ${price} euro (drempel ${alert.threshold}).`;

    await prisma.$transaction([
      prisma.priceAlert.update({
        where: { id: alert.id },
        data: { lastFiredAt: new Date(), lastFiredCity: cityId },
      }),
      prisma.gameLog.create({
        data: { userId, type: "ALERT", message },
      }),
    ]);
    fired += 1;
  }
  return fired;
}
