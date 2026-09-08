# Onderwereld

Browser-based tekst/strategie-MMORPG in de geest van klassieke Nederlandse maffiaspellen (Crime-Club e.d.). Donkere UI, Dutch copy, misdaden, garage, bank, winkel, PvP, berichten en families.

Source of truth is **Origin**, not GitHub. Do not mirror this repo to GitHub just to deploy.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Auth.js (NextAuth) credentials + JWT, wachtwoorden via bcryptjs
- Prisma ORM + **SQLite locally** / **PostgreSQL in production** (required on Vercel)
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

| Variabele | Local | Production (Vercel) | Uitleg |
|-----------|-------|---------------------|--------|
| `DATABASE_URL` | `file:./dev.db` | `postgresql://…` (Neon / Supabase / Vercel Postgres) | SQLite locally; **Postgres required on Vercel** |
| `AUTH_SECRET` | long random string | **required**, `openssl rand -base64 32` | JWT signing secret |
| `AUTH_TRUST_HOST` | `true` | `true` | Auth.js trusts the Host header |
| `AUTH_URL` | omit | `https://<your-public-host>` (optional but recommended) | Canonical public origin |
| `FORCE_SEED` | unset | **do not set** on a live game | Seed wipes all tables when `1` |
| `SKIP_DEMO_USERS` | unset | `1` if you do not want demo accounts | Skip DonDemo / rival seed users |

### PostgreSQL (production)

SQLite is **unsuitable for Vercel/serverless**: each lambda has an ephemeral disk, the file is not shared, and writes are lost between invocations.

1. Create a hosted Postgres database (Neon, Supabase, or Vercel Postgres).
2. In `prisma/schema.prisma`, set datasource `provider` to `"postgresql"`.
3. Set `DATABASE_URL` to the pooled connection string (`sslmode=require`).
4. Apply schema once: `npx prisma db push` (or `prisma migrate deploy` once you add migrations).
5. Seed **once** on an empty database: `npx prisma db seed`. Seed refuses to wipe an existing catalog unless `FORCE_SEED=1`.

Schema types are SQLite-portable (no native enums, `Int` for money) so the same models work on Postgres.

## Deploy on Vercel (Origin is source of truth)

Do **not** create a GitHub mirror solely for Vercel. Origin ↔ Vercel is a supported git integration.

Origin slug: `jkfd/tmp-7986da93878ae014`  
Clone: `https://origin.cursor.com/git/jkfd/tmp-7986da93878ae014.git`  
Repo view: `https://origin.cursor.com/jkfd/tmp-7986da93878ae014.git`

### Blockers you must clear yourself

1. **Vercel team plan** — Origin repositories are private. [Vercel for Origin](https://vercel.com/docs/git/vercel-for-origin) cannot deploy from a **Hobby** team. You need Owner/Member on a Vercel team, then **Continue with Origin** (or Origin repo → Apps → Vercel).
2. **Hosted Postgres** — set `DATABASE_URL` *before* the first production build. Keep `provider = "postgresql"` in `schema.prisma` for that deploy (local SQLite stays the default in git until you switch).
3. **Env vars on the Vercel project** — see the table above. `AUTH_SECRET` is mandatory; a missing secret fails Auth.js at runtime.
4. **Do not run seed on every deploy.** `vercel.json` only runs `prisma generate && next build`. After the first successful deploy, run `db push` + one seed against production (Vercel → Storage / a one-off `npx prisma db push && npx prisma db seed` with production env).

### Steps

1. Switch Prisma provider to `postgresql` (commit that change when you are ready to go live).
2. In Vercel: **New Project → Continue with Origin** → this repository.
3. Framework preset: Next.js (also set in `vercel.json`).
4. Add environment variables for Production (and Preview if you want preview deploys to work).
5. Deploy. After the build succeeds, apply schema + seed once against `DATABASE_URL`.
6. Set `AUTH_URL` to the resulting `https://….vercel.app` (or custom domain) and redeploy if Auth.js CSRF complains.

This agent cannot create the Vercel project, provision Postgres, or emit a public play URL — those need your Vercel + Origin accounts.

## Scripts

| Script | Wat |
|--------|-----|
| `npm run setup` | `prisma generate` + `db push` + seed |
| `npm run db:reset` | database leeggooien en opnieuw seeden (`FORCE_SEED=1`) |
| `npm run db:deploy` | `prisma db push` (eerste productieschema, geen seed) |
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
