export const ACHIEVEMENT_DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "IMPOSSIBLE"] as const;
export type AchievementDifficulty = (typeof ACHIEVEMENT_DIFFICULTIES)[number];

export const ACHIEVEMENT_METRICS = [
  "CRIMES",
  "CASH",
  "CASH_EARNED",
  "TRAVEL",
  "GYM",
  "GYM_EXP",
  "HOEREN",
  "WORKERS",
  "KILLS",
  "LOGINS",
  "EXP",
  "VEHICLES",
  "FAMILY",
  "BULLETS",
] as const;
export type AchievementMetric = (typeof ACHIEVEMENT_METRICS)[number];

export type AchievementDef = {
  slug: string;
  title: string;
  description: string;
  difficulty: AchievementDifficulty;
  metric: AchievementMetric;
  target: number;
  rewardExp: number;
  rewardPimpExp: number;
  rewardGymExp: number;
  rewardCash: number;
  rewardBullets: number;
  rewardTitle: string | null;
  rewardNameColor: string | null;
  sortOrder: number;
};

export const NAME_COLOR_SWATCHES: { hex: string; label: string }[] = [
  { hex: "#d4a359", label: "Goud" },
  { hex: "#f5d08a", label: "Ivoor" },
  { hex: "#e8c36a", label: "Messing" },
  { hex: "#c45c4a", label: "Bordeaux" },
  { hex: "#ef4444", label: "Bloed" },
  { hex: "#fb7185", label: "Roze neon" },
  { hex: "#22c55e", label: "Jade" },
  { hex: "#38bdf8", label: "IJs" },
  { hex: "#7c3aed", label: "Violet" },
  { hex: "#a78bfa", label: "Amethist" },
  { hex: "#facc15", label: "Citroen" },
  { hex: "#f8fafc", label: "Ivoorwit" },
];

export const NAME_COLOR_SET = new Set(NAME_COLOR_SWATCHES.map((row) => row.hex));

function def(
  sortOrder: number,
  slug: string,
  title: string,
  description: string,
  difficulty: AchievementDifficulty,
  metric: AchievementMetric,
  target: number,
  rewards: {
    exp?: number;
    pimp?: number;
    gym?: number;
    cash?: number;
    bullets?: number;
    title?: string;
    color?: string;
  } = {},
): AchievementDef {
  return {
    slug,
    title,
    description,
    difficulty,
    metric,
    target,
    rewardExp: rewards.exp ?? 0,
    rewardPimpExp: rewards.pimp ?? 0,
    rewardGymExp: rewards.gym ?? 0,
    rewardCash: rewards.cash ?? 0,
    rewardBullets: rewards.bullets ?? 0,
    rewardTitle: rewards.title ?? null,
    rewardNameColor: rewards.color ?? null,
    sortOrder,
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  def(10, "crime-1", "Eerste klus", "Rond je eerste misdaad succesvol af.", "EASY", "CRIMES", 1, {
    exp: 40,
    cash: 500,
    title: "Straatrat",
  }),
  def(11, "crime-10", "Nachtploeg", "Slaag 10 keer bij een misdaad.", "EASY", "CRIMES", 10, {
    exp: 120,
    cash: 2_500,
    bullets: 10,
  }),
  def(12, "login-3", "Terug op straat", "Log 3 keer in.", "EASY", "LOGINS", 3, {
    exp: 25,
    cash: 400,
  }),
  def(13, "cash-5k", "Zakgeld", "Heb €5.000 cash op zak.", "EASY", "CASH", 5_000, {
    exp: 50,
    cash: 1_000,
    color: "#d4a359",
  }),
  def(14, "travel-1", "Eerste boarding", "Boek je eerste vlucht.", "EASY", "TRAVEL", 1, {
    exp: 40,
    cash: 750,
  }),
  def(15, "gym-1", "Eerste set", "Rond één gymtraining af.", "EASY", "GYM", 1, {
    gym: 40,
    cash: 300,
  }),
  def(16, "hoeren-1", "Poortwachter", "Verdien 25 hoeren-exp.", "EASY", "HOEREN", 25, {
    pimp: 30,
    cash: 800,
  }),
  def(17, "family-1", "Made man", "Sluit je aan bij een familie of sticht er een.", "EASY", "FAMILY", 1, {
    exp: 80,
    cash: 2_000,
    title: "Soldaat",
  }),

  def(30, "crime-50", "Routineklus", "Slaag 50 keer bij een misdaad.", "MEDIUM", "CRIMES", 50, {
    exp: 400,
    cash: 12_000,
    bullets: 40,
    color: "#c45c4a",
  }),
  def(31, "cash-earned-100k", "Honderdduizend", "Verdien in totaal €100.000.", "MEDIUM", "CASH_EARNED", 100_000, {
    exp: 350,
    cash: 15_000,
    title: "Pickpocket",
  }),
  def(32, "travel-15", "Pendelaar", "Boek 15 vluchten.", "MEDIUM", "TRAVEL", 15, {
    exp: 280,
    cash: 8_000,
    color: "#38bdf8",
  }),
  def(33, "gym-25", "IJzeren routine", "Train 25 keer in de gym.", "MEDIUM", "GYM", 25, {
    gym: 400,
    exp: 200,
    cash: 4_000,
  }),
  def(34, "hoeren-2k", "Nachtmanager", "Bereik 2.000 hoeren-exp.", "MEDIUM", "HOEREN", 2_000, {
    pimp: 250,
    cash: 10_000,
    title: "Nachtvlinder",
  }),
  def(35, "kills-5", "Eerste lijken", "Maak 5 kills.", "MEDIUM", "KILLS", 5, {
    exp: 500,
    bullets: 80,
    color: "#ef4444",
  }),
  def(36, "login-25", "Verslaafd aan de straat", "Log 25 keer in.", "MEDIUM", "LOGINS", 25, {
    exp: 200,
    cash: 5_000,
  }),
  def(37, "vehicles-8", "Wagenpark", "Heb 8 auto's in de garage.", "MEDIUM", "VEHICLES", 8, {
    exp: 220,
    cash: 6_000,
  }),
  def(38, "workers-4", "Stal van vier", "Heb 4 hoeren in dienst.", "MEDIUM", "WORKERS", 4, {
    pimp: 180,
    cash: 7_500,
  }),
  def(39, "exp-25k", "Naam in de wijk", "Bereik 25.000 speler-exp.", "MEDIUM", "EXP", 25_000, {
    exp: 800,
    cash: 10_000,
    color: "#e8c36a",
  }),

  def(50, "crime-250", "Beroepsmisdadiger", "Slaag 250 keer bij een misdaad.", "HARD", "CRIMES", 250, {
    exp: 2_000,
    cash: 60_000,
    bullets: 150,
    title: "Street Boss",
  }),
  def(51, "cash-earned-1m", "Miljonair", "Verdien in totaal €1.000.000.", "HARD", "CASH_EARNED", 1_000_000, {
    exp: 1_800,
    cash: 80_000,
    color: "#facc15",
  }),
  def(52, "travel-80", "Luchthavenrat", "Boek 80 vluchten.", "HARD", "TRAVEL", 80, {
    exp: 1_200,
    cash: 25_000,
    color: "#22c55e",
  }),
  def(53, "gym-exp-25k", "Beton in het bloed", "Bereik 25.000 gym-exp.", "HARD", "GYM_EXP", 25_000, {
    gym: 2_000,
    exp: 900,
    cash: 20_000,
  }),
  def(54, "hoeren-25k", "Poortkoning", "Bereik 25.000 hoeren-exp.", "HARD", "HOEREN", 25_000, {
    pimp: 1_500,
    cash: 50_000,
    title: "Capo",
    color: "#fb7185",
  }),
  def(55, "kills-25", "Hitman", "Maak 25 kills.", "HARD", "KILLS", 25, {
    exp: 2_500,
    bullets: 300,
    cash: 40_000,
    color: "#7c3aed",
  }),
  def(56, "login-100", "Huisbaas van de nacht", "Log 100 keer in.", "HARD", "LOGINS", 100, {
    exp: 1_000,
    cash: 20_000,
    color: "#f5d08a",
  }),
  def(57, "exp-150k", "Naam in de krant", "Bereik 150.000 speler-exp.", "HARD", "EXP", 150_000, {
    exp: 3_000,
    cash: 50_000,
    title: "Consigliere",
  }),
  def(58, "bullets-500", "Munitiekamer", "Heb 500 kogels op zak.", "HARD", "BULLETS", 500, {
    bullets: 200,
    cash: 15_000,
  }),
  def(59, "vehicles-20", "Autokoning", "Heb 20 auto's in de garage.", "HARD", "VEHICLES", 20, {
    exp: 1_400,
    cash: 35_000,
  }),

  def(70, "crime-1000", "Mythe van de straat", "Slaag 1.000 keer bij een misdaad.", "IMPOSSIBLE", "CRIMES", 1_000, {
    exp: 12_000,
    cash: 250_000,
    bullets: 800,
    title: "Don van de Stad",
    color: "#a78bfa",
  }),
  def(71, "cash-earned-10m", "Tien miljoen", "Verdien in totaal €10.000.000.", "IMPOSSIBLE", "CASH_EARNED", 10_000_000, {
    exp: 10_000,
    cash: 400_000,
    title: "Underboss",
    color: "#f8fafc",
  }),
  def(72, "travel-400", "Wereldreiziger", "Boek 400 vluchten.", "IMPOSSIBLE", "TRAVEL", 400, {
    exp: 6_000,
    cash: 120_000,
  }),
  def(73, "gym-exp-200k", "IJzeren mythe", "Bereik 200.000 gym-exp.", "IMPOSSIBLE", "GYM_EXP", 200_000, {
    gym: 8_000,
    exp: 5_000,
    cash: 80_000,
  }),
  def(74, "hoeren-200k", "Keizer van de Wallen", "Bereik 200.000 hoeren-exp.", "IMPOSSIBLE", "HOEREN", 200_000, {
    pimp: 10_000,
    cash: 300_000,
    title: "Keizer",
  }),
  def(75, "kills-100", "Reaper", "Maak 100 kills.", "IMPOSSIBLE", "KILLS", 100, {
    exp: 15_000,
    bullets: 1_500,
    cash: 200_000,
    title: "Reaper",
    color: "#7c3aed",
  }),
  def(76, "login-365", "Een jaar in de onderwereld", "Log 365 keer in.", "IMPOSSIBLE", "LOGINS", 365, {
    exp: 8_000,
    cash: 100_000,
    title: "Onsterfelijk",
  }),
  def(77, "exp-1m", "Legende", "Bereik 1.000.000 speler-exp.", "IMPOSSIBLE", "EXP", 1_000_000, {
    exp: 25_000,
    cash: 500_000,
    title: "Mythe",
    color: "#facc15",
  }),
];

export const ACHIEVEMENT_BY_SLUG = new Map(ACHIEVEMENTS.map((row) => [row.slug, row]));

export const ACHIEVEMENT_TITLES = [
  ...new Set(ACHIEVEMENTS.map((row) => row.rewardTitle).filter((row): row is string => Boolean(row))),
];

export function isCatalogTitle(value: string | null | undefined) {
  return !!value && ACHIEVEMENT_TITLES.includes(value);
}

export function isCatalogNameColor(value: string | null | undefined) {
  return !!value && NAME_COLOR_SET.has(value.toLowerCase());
}

export const DIFFICULTY_UI: Record<
  AchievementDifficulty,
  { label: string; emoji: string; className: string }
> = {
  EASY: { label: "Makkelijk", emoji: "🟢", className: "text-emerald-400" },
  MEDIUM: { label: "Gemiddeld", emoji: "🟡", className: "text-amber-300" },
  HARD: { label: "Moeilijk", emoji: "🔴", className: "text-red-400" },
  IMPOSSIBLE: { label: "Onmogelijk", emoji: "🟣", className: "text-violet-400" },
};
