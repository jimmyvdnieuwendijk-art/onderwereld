export const STARTER_CASH = 500;
export const STARTER_ENERGY = 100;
export const STARTER_HEALTH = 100;
export const MAX_ENERGY = 100;
export const MAX_HEALTH = 100;
export const BASE_ATTACK = 5;

/** 1 energy / 12s → full bar (~100) in ~20 min. Was 2/10s ≈ 8 min. */
export const ENERGY_PER_TICK = 1;
/** Milliseconds between energy ticks. */
export const ENERGY_TICK_MS = 12_000;

/** Hourly bank interest. 0.1%/uur ≈ 2,4%/dag. Was 1%/uur. */
export const BANK_INTEREST_RATE = 0.001;
export const BANK_INTEREST_INTERVAL_MS = 60 * 60 * 1000;
/** One-time fee taken from a bank withdrawal. Player receives 99%. */
export const BANK_WITHDRAW_KEEP = 0.99;

export function bankWithdrawPayout(amount: number) {
  const value = Math.floor(amount);
  const received = Math.floor(value * BANK_WITHDRAW_KEEP);
  return { value, received, fee: value - received };
}

export const FAMILY_CREATE_COST = 25_000;
export const BAIL_PER_MINUTE = 80;
export const HOSPITAL_PER_MINUTE = 60;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export const BIO_MAX = 300;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;
export const PASSWORD_MIN = 6;
/** Max avatar upload size (bytes). Keep under the Server Action body limit. */
export const AVATAR_MAX_BYTES = 1_000_000;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
export const ONLINE_WINDOW_MS = 3 * 60 * 1000;
export const LAST_SEEN_WRITE_MS = 60 * 1000;

export const CHAT_BODY_MAX = 280;
export const CHAT_RATE_MS = 4_000;
export const CHAT_BURST_MAX = 25;
export const CHAT_BURST_WINDOW_MS = 10 * 60 * 1000;
export const CHAT_KEEP = 250;
export const CHAT_PAGE_SIZE = 80;
export const CHAT_CHANNEL_WORLD = "WORLD";
export const CHAT_CHANNEL_FAMILY = "FAMILY";
export const CHAT_IMAGE_MAX_BYTES = AVATAR_MAX_BYTES;

export const LOG_PAGE_SIZE = 20;
export const LOG_MAX_PAGES = 5;
export const LOG_KEEP = LOG_PAGE_SIZE * LOG_MAX_PAGES;

export const ITEM_WEAPON = "WEAPON";
export const ITEM_ARMOR = "ARMOR";
export const ITEM_CONSUMABLE = "CONSUMABLE";
export const ITEM_AMMO = "AMMO";

export const LISTING_BULLETS = "BULLETS";
export const LISTING_DRUGS = "DRUGS";
export const LISTING_WEAPONS = "WEAPONS";
export const LISTING_VEHICLE = "VEHICLE";
export const LISTING_ITEM = "ITEM";

export const ROLE_DON = "DON";
export const ROLE_UNDERBOSS = "UNDERBOSS";
export const ROLE_CONSIGLIERE = "CONSIGLIERE";
export const ROLE_CAPO = "CAPO";
export const ROLE_LIEUTENANT = "LIEUTENANT";
export const ROLE_SOLDIER = "SOLDIER";
export const ROLE_ASSOCIATE = "ASSOCIATE";
/** @deprecated Use ROLE_DON */
export const ROLE_LEADER = ROLE_DON;
/** @deprecated Use ROLE_UNDERBOSS */
export const ROLE_OFFICER = ROLE_UNDERBOSS;
/** @deprecated Use ROLE_SOLDIER */
export const ROLE_MEMBER = ROLE_SOLDIER;

export const FAMILY_MEMBER_LIMIT_START = 8;
export const FAMILY_MEMBER_LIMIT_MAX = 40;
export const FAMILY_MEMBER_LIMIT_STEPS = [8, 12, 16, 20, 24, 28, 32, 36, 40] as const;
export const FAMILY_ANNOUNCE_MAX = 400;
export const FAMILY_PAGE_TEXT_MAX = 8000;
export const FAMILY_PAGE_IMAGES_MAX = 8;
export const FAMILY_HOUR_MS = 60 * 60 * 1000;
