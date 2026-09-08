import {
  Banknote,
  Car,
  Cross,
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
  Users,
  VenetianMask,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/game", label: "Overzicht", icon: LayoutDashboard },
  { href: "/game/misdaden", label: "Misdaden", icon: Skull },
  { href: "/game/vliegveld", label: "Vliegveld", icon: Plane },
  { href: "/game/hoeren", label: "Hoeren", icon: VenetianMask },
  { href: "/game/auto-stelen", label: "Auto stelen", icon: Car },
  { href: "/game/garage", label: "Garage", icon: Home },
  { href: "/game/bank", label: "Bank", icon: Banknote },
  { href: "/game/winkel", label: "Winkel", icon: ShoppingBag },
  { href: "/game/markt", label: "Markt", icon: Store },
  { href: "/game/spelers", label: "Spelers", icon: Search },
  { href: "/game/familie", label: "Familie", icon: Users },
  { href: "/game/berichten", label: "Berichten", icon: Mail },
  { href: "/game/gevangenis", label: "Gevangenis", icon: Gavel },
  { href: "/game/ziekenhuis", label: "Ziekenhuis", icon: Cross },
  { href: "/game/logboek", label: "Logboek", icon: MessageSquare },
] as const;

export const MOBILE_PRIMARY = [
  { href: "/game", label: "Home", icon: LayoutDashboard },
  { href: "/game/misdaden", label: "Misdaad", icon: Swords },
  { href: "/game/spelers", label: "PvP", icon: Shield },
  { href: "/game/berichten", label: "Post", icon: Mail },
] as const;
