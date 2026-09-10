import {
  Banknote,
  Car,
  Cross,
  Dices,
  Dumbbell,
  Gavel,
  Home,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Plane,
  Search,
  Shield,
  ShoppingBag,
  Skull,
  Store,
  Swords,
  UserCog,
  Users,
  VenetianMask,
} from "lucide-react";

const overzicht = { href: "/game", label: "Overzicht", icon: LayoutDashboard };
const misdaden = { href: "/game/misdaden", label: "Misdaden", icon: Skull };
const vliegveld = { href: "/game/vliegveld", label: "Vliegveld", icon: Plane };
const hoeren = { href: "/game/hoeren", label: "Hoeren", icon: VenetianMask };
const gym = { href: "/game/gym", label: "Gym", icon: Dumbbell };
const casino = { href: "/game/casino", label: "Casino", icon: Dices };
const autoStelen = { href: "/game/auto-stelen", label: "Auto stelen", icon: Car };
const garage = { href: "/game/garage", label: "Garage", icon: Home };
const bank = { href: "/game/bank", label: "Bank", icon: Banknote };
const winkel = { href: "/game/winkel", label: "Winkel", icon: ShoppingBag };
const markt = { href: "/game/markt", label: "Markt", icon: Store };
const spelers = { href: "/game/spelers", label: "Spelers", icon: Search };
const familie = { href: "/game/familie", label: "Familie", icon: Users };
const gevangenis = { href: "/game/gevangenis", label: "Gevangenis", icon: Gavel };
const ziekenhuis = { href: "/game/ziekenhuis", label: "Ziekenhuis", icon: Cross };
const account = { href: "/game/account", label: "Account", icon: UserCog };
const berichten = { href: "/game/berichten", label: "Berichten", icon: Mail };
const logboek = { href: "/game/logboek", label: "Logboek", icon: MessageSquare };

export const NAV_GROUPS = [
  { id: "hoofd", label: "Hoofd", items: [overzicht] },
  { id: "actie", label: "Actie", items: [misdaden, vliegveld, hoeren, gym, casino] },
  { id: "voertuigen", label: "Voertuigen", items: [autoStelen, garage] },
  { id: "economie", label: "Economie", items: [bank, winkel, markt] },
  { id: "sociaal", label: "Sociaal", items: [spelers, familie, gevangenis, ziekenhuis] },
  { id: "account", label: "Account", items: [account, berichten, logboek] },
] as const;

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => [...group.items]);

/** Overzicht is exact `/game`; other items also match nested routes. */
export function isNavActive(pathname: string, href: string) {
  if (href === "/game") return pathname === "/game";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const MOBILE_PRIMARY = [
  { href: "/game", label: "Home", icon: LayoutDashboard },
  { href: "/game/misdaden", label: "Misdaad", icon: Swords },
  { href: "/game/spelers", label: "PvP", icon: Shield },
  { href: "/game/berichten", label: "Post", icon: Mail },
] as const;

export const DASHBOARD_LINKS = [
  { href: "/game/misdaden", label: "Misdaden", hint: "Cash en exp op straat", icon: Skull },
  { href: "/game/vliegveld", label: "Vliegveld", hint: "Tien steden, smokkel", icon: Plane },
  { href: "/game/hoeren", label: "Hoeren", hint: "Ramen, crew en empire", icon: VenetianMask },
  { href: "/game/gym", label: "Gym", hint: "Kracht, conditie, vuisten", icon: Dumbbell },
  { href: "/game/casino", label: "Casino", hint: "Roulette, poker, de kooi", icon: Dices },
  { href: "/game/auto-stelen", label: "Auto stelen", hint: "Van Corsa tot Chiron", icon: Car },
  { href: "/game/bank", label: "Bank", hint: "Rente en een kluis", icon: Banknote },
  { href: "/game/winkel", label: "Winkel", hint: "Staal en kogels", icon: ShoppingBag },
] as const;
