# Onderwereld

Browser-based tekst/strategie-MMORPG in de geest van klassieke Nederlandse maffiaspellen (Crime-Club e.d.). Donkere UI, Dutch copy, misdaden, garage, bank, winkel, PvP, berichten en families.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Auth.js (NextAuth) credentials + JWT, wachtwoorden via bcryptjs
- Prisma ORM + **SQLite** (werkt out of the box)
- TanStack React Query voor live stats / shoutbox

## Snel starten

```bash
cp .env.example .env
# zet AUTH_SECRET op een lange random string
npm install
npm run setup
npm run dev
```

De app draait op [http://localhost:43147](http://localhost:43147).

Demo-account (na seed):

- e-mail: `demo@onderwereld.nl`
- wachtwoord: `demo1234`
- personage: **DonDemo** (Amsterdam)

Andere gezaaide rivalen (zelfde wachtwoord): DeNachtjager, Bloedhond, SilentSjaak, KiraVanZuid.

## Environment

| Variabele       | Voorbeeld              | Uitleg |
|-----------------|------------------------|--------|
| `DATABASE_URL`  | `file:./dev.db`        | SQLite-bestand (relatief t.o.v. `prisma/`) |
| `AUTH_SECRET`   | lange random string    | verplicht voor JWT-sessies |
| `AUTH_URL`      | `http://localhost:43147` | optioneel, handig lokaal |

### PostgreSQL

1. Zet in `prisma/schema.prisma` de datasource `provider` op `"postgresql"`.
2. Zet `DATABASE_URL` op `postgresql://USER:PASSWORD@HOST:5432/DBNAME`.
3. Run `npx prisma db push && npx prisma db seed` (of `migrate dev` in productie).

Schema-types zijn bewust SQLite-vriendelijk (geen native enums, `Int` voor geld) zodat dezelfde modellen op Postgres werken.

## Scripts

| Script | Wat |
|--------|-----|
| `npm run setup` | `prisma generate` + `db push` + seed |
| `npm run db:reset` | database leeggooien en opnieuw seeden |
| `npm run dev` | development server op poort **43147** |
| `npm run build` / `start` | productiebuild |

## Spelen

1. Registreer (gebruikersnaam + startstad) of log in met het demo-account.
2. Pleeg **misdaden** voor cash/exp (energie + cooldown + celkans).
3. **Steel auto's**, verkoop of repareer ze in de garage, of zet ze op de markt.
4. Stort cash op de **bank** (veilig bij PvP). 1% rente per gespeeld uur wordt bij een player-tick bijgeschreven — geen cron nodig. Voor een echte hourly job: cron `GET`/script dat `lastInterestAt` afhandelt.
5. Koop wapens/vesten/kogels, rust uit, val andere spelers aan.
6. Inbox + shoutbox + families.

Jail en ziekenhuis: wachten of borg/privékliniek betalen.

## Projectstructuur

```
prisma/schema.prisma   # alle core models
prisma/seed.ts         # rangen, misdaden, voertuigen, winkel, demo-spelers
src/auth.ts            # Auth.js
src/lib/game/player.ts # energy regen, rente, rank-up, timers
src/lib/actions/       # server actions (misdaad, economie, PvP, social)
src/app/game/          # beschermde speelomgeving
```
