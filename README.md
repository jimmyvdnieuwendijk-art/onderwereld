# Onderwereld

Browser-based tekst/strategie-MMORPG in de geest van klassieke Nederlandse maffiaspellen (Crime-Club e.d.). Donkere UI, Dutch copy, misdaden, garage, bank, winkel, PvP, berichten en families.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Auth.js (NextAuth) credentials + JWT, wachtwoorden via bcryptjs
- Prisma ORM + **PostgreSQL** (Neon / Supabase / Vercel Postgres). SQLite is a local-only alternative, not for Vercel.
- TanStack React Query voor live stats / shoutbox

## Snel starten

```bash
cp .env.example .env
# zet AUTH_SECRET (openssl rand -base64 32)
# zet DATABASE_URL op een echte Postgres-URL (lokaal of Neon/Supabase)
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

| Variabele | Local | Production (Vercel) | Uitleg |
|-----------|-------|---------------------|--------|
| `DATABASE_URL` | `postgresql://USER:PASSWORD@localhost:5432/onderwereld` | Neon **pooled** URL (`sslmode=require`) | Prisma provider is **postgresql**. SQLite (`file:./dev.db`) only if you switch the provider back. |
| `AUTH_SECRET` | long random string | **required**, `openssl rand -base64 32` | JWT signing secret |
| `AUTH_TRUST_HOST` | `true` | `true` | Auth.js trusts the Host header |
| `AUTH_URL` | omit | `https://<your-public-host>` (optional but recommended) | Canonical public origin |
| `FORCE_SEED` | unset | **do not set** on a live game | Seed wipes all tables when `1` |
| `SKIP_DEMO_USERS` | unset | `1` if you do not want demo accounts | Skip DonDemo / rival seed users |

### PostgreSQL (default)

The Prisma datasource provider is `"postgresql"`. SQLite is **unsuitable for Vercel/serverless**: each lambda has an ephemeral disk, the file is not shared, and writes are lost between invocations.

This repo does not ship database credentials. For the free public deploy, use **Neon** (free Postgres) as described below.

**Local SQLite (optional):** set `provider = "sqlite"` in `prisma/schema.prisma` and `DATABASE_URL="file:./dev.db"`. Do not use that on Vercel.

## Deploy (free): GitHub + Vercel Hobby + Neon

This path does **not** need Vercel Pro or Origin Apps. Origin-hosted repos are private and cannot deploy on a Vercel Hobby team. A **public GitHub** repo can.

Prisma stays on `postgresql`. `vercel.json` runs `prisma generate && next build` (no seed on deploy).

### 1. Put the code on GitHub (public)

Create a public repository named `onderwereld` under your GitHub user, then push `main`:

```bash
# from a machine logged into GitHub (gh auth login, or GH_TOKEN)
gh repo create onderwereld --public --source=. --remote=github --push
```

Or in the GitHub UI: **New repository** → name `onderwereld` → Public → then:

```bash
git remote add github https://github.com/YOUR_USER/onderwereld.git
git push -u github main
```

Do not invent a GitHub remote until that repo exists. This project is already at [https://github.com/jimmyvdnieuwendijk-art/onderwereld](https://github.com/jimmyvdnieuwendijk-art/onderwereld). Origin (`origin`) can stay as a Cursor remote; Vercel should import **GitHub**, not Origin.

### 2. Neon Postgres (`sparkling-mouse-47508820`)

This repo is pointed at Neon project **`sparkling-mouse-47508820`**, branch **`production`**.

Config in the repo:

- [`neon.ts`](./neon.ts) — Neon config-as-code (`defineConfig({})`)
- [`.neon`](./.neon) — project/branch context (IDs only, no passwords)
- Prisma `provider` is `"postgresql"`; Vercel `DATABASE_URL` must be this project's **pooled** connection string

**CLI (needs a browser login on your machine — this agent cannot finish OAuth to `127.0.0.1`):**

```bash
npm i -g neon@latest
neon login
neon link --project-id sparkling-mouse-47508820 --branch production -y
neon deploy
# writes DATABASE_URL into .env.local (gitignored)
neon env pull
```

**Vercel Hobby env:** in the Neon console for this project → Connection details → copy the **pooled** URI into Vercel `DATABASE_URL` (keep `sslmode=require`). Use the **direct** (unpooled) URI only on your laptop for `npx prisma db push` and `npx prisma db seed`. Never commit the URI.

Placeholder shape only:

```
postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

### 3. Import on Vercel Hobby

1. [vercel.com](https://vercel.com) → **Add New… → Project**.
2. Import the **GitHub** repository [`jimmyvdnieuwendijk-art/onderwereld`](https://github.com/jimmyvdnieuwendijk-art/onderwereld) (install the Vercel GitHub app if asked).
3. Framework: **Next.js** (also set in `vercel.json`). Root directory: `.`
4. **Hobby** is enough. Do not use “Continue with Origin”.
5. Add environment variables **before** the first deploy (Production; add Preview too if you want preview URLs to work):

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon **pooled** URL |
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | leave empty on the first deploy; set to `https://<project>.vercel.app` afterward if Auth.js CSRF complains |

6. Deploy. Build does not need a reachable database; runtime and seed do.

### 4. Apply schema and seed once

After the first successful deploy, from your machine (not on every Vercel build):

```bash
export DATABASE_URL="postgresql://…neon…direct…"   # Neon direct URL
npx prisma db push
npx prisma db seed
```

Seed refuses to wipe an existing catalog unless `FORCE_SEED=1`. Optional: `SKIP_DEMO_USERS=1` to skip DonDemo and rivals.

Then open `https://<project>.vercel.app`, register or log in with the demo account if you seeded it.

## Scripts

| Script | Wat |
|--------|-----|
| `npm run setup` | `prisma generate` + `db push` + seed |
| `npm run db:reset` | database leeggooien en opnieuw seeden (`FORCE_SEED=1`) |
| `npm run db:deploy` | `prisma db push` (eerste productieschema, geen seed) |
| `npm run dev` | development server op poort **43147** |
| `npm run build` / `start` | productiebuild |

## Spelen

1. Registreer of log in met het demo-account. Je start in **Amsterdam (Schiphol)**.
2. Pleeg **misdaden** voor cash/exp (energie + cooldown + celkans). Gezocht-niveau loopt op bij mislukte klussen. Nieuw: pinautomaat, havencontainer, beschermingsgeld, museumroof, legerarsenaal.
3. Open **Vliegveld** in het linkermenu: boek een lijnvlucht of privéjet naar 10 steden. Onderweg zijn misdaden, PvP en handel geblokkeerd.
4. **Smokkel** op het vliegveld: drugs, wapenkisten en kogels hebben per stad andere prijzen (Medellín goedkoop in drugs, Tokyo duur; Miami goedkoop in kogels).
5. **Steel auto's** (o.a. Opel Corsa, Audi RS6, Range Rover, Ferrari Roma, Bugatti Chiron), verkoop of repareer ze in de garage, of zet ze op de markt.
6. Stort cash op de **bank** (veilig bij PvP). 1% rente per gespeeld uur wordt bij een player-tick bijgeschreven.
7. Koop wapens/vesten/kogels, rust uit, val andere spelers aan (niet tijdens een vlucht).
8. Open **Hoeren** in het linkermenu (**Dark Red Light Empire**): ronsel via club, **straat** of **stripclub**; wijs escorts toe aan high-class, underground strip, live cams of BDSM-club (consensueel, 21+). Huur ramen, boek Dark Room, stuur **VIP / high-roller / corrupte wethouder** (USB-kompromat op de gast — gezocht omlaag, cash of stoepdekking). Claim **straat-hoeken** tegen NPC-pimps (De Roos, Uncle Vito, Madame K). Risico’s: gastgeweld (conditie), zedenrazzia (gezocht), rival takeover, optionele uitbraak (−35% omzet, kliniek). Pimp-exp bepaalt rang (Street Hustler → Ghetto Mogul). Main escort +10% verdediging. Geen slavernijmeters, geen vleesmarkt, geen dwang.
9. **Spelers** is een klassement (rang, exp, cash, kills). De stad van andere spelers is niet zichtbaar.
10. Inbox + shoutbox + families. Berichten staat onderaan het menu, boven Logboek.

Jail en ziekenhuis: wachten of borg/privékliniek betalen.

## Projectstructuur

```
prisma/schema.prisma   # alle core models
prisma/seed.ts         # rangen, misdaden, voertuigen, winkel, demo-spelers
src/auth.ts            # Auth.js
src/lib/game/player.ts # energy regen, rente, rank-up, timers, pimp-tick
src/lib/pimp.ts        # pimp-rangen, ramen, payouts
src/lib/empire.ts      # Dark Red Light Empire (zaken, stoepen, VIP, kompromat)
src/lib/actions/       # server actions (misdaad, economie, PvP, social, pimp, empire)
src/app/game/          # beschermde speelomgeving
```
