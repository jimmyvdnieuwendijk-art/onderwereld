export type EscortDTO = {
  id: string;
  name: string;
  avatar: string;
  charm: number;
  loyalty: number;
  health: number;
  cityId: string;
  cityName: string;
  windowId: string | null;
  listedPrice: number | null;
  isMain: boolean;
  hourly: number;
  busy: boolean;
  busyUntil: string | null;
  missionKind: string | null;
  missionKey: string | null;
  missionLabel: string | null;
  npcPrice: number;
};

export type WindowDTO = {
  id: string | null;
  slotIndex: number;
  hiredUntil: string | null;
  hired: boolean;
  escort: { id: string; name: string; avatar: string } | null;
  fee: number;
  status: "actief" | "leeg" | "razzia";
};

export type MarketEscortDTO = {
  id: string;
  name: string;
  avatar: string;
  charm: number;
  loyalty: number;
  health: number;
  cityName: string;
  listedPrice: number;
  seller: string;
};
