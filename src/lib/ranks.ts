/** Street rank ladder. Names are the live in-game titles. */
export const PLAYER_RANKS = [
  { slug: "scum", name: "Scum", minExp: 0, order: 1 },
  { slug: "pee-wee", name: "Pee Wee", minExp: 250, order: 2 },
  { slug: "thug", name: "Thug", minExp: 800, order: 3 },
  { slug: "gangster", name: "Gangster", minExp: 2000, order: 4 },
  { slug: "hitman", name: "Hitman", minExp: 5000, order: 5 },
  { slug: "assassin", name: "Assassin", minExp: 12000, order: 6 },
  { slug: "boss", name: "Boss", minExp: 25000, order: 7 },
  { slug: "godfather", name: "Godfather", minExp: 50000, order: 8 },
  { slug: "legendary-godfather", name: "Legendary Godfather", minExp: 100000, order: 9 },
  { slug: "don", name: "Don", minExp: 200000, order: 10 },
  { slug: "respectable-don", name: "Respectable Don", minExp: 400000, order: 11 },
  { slug: "legendary-don", name: "Legendary Don", minExp: 800000, order: 12 },
] as const;

export type PlayerRankDef = (typeof PLAYER_RANKS)[number];

export function rankForExp(exp: number, ranks: readonly PlayerRankDef[] = PLAYER_RANKS) {
  return [...ranks].reverse().find((rank) => exp >= rank.minExp) ?? ranks[0];
}
