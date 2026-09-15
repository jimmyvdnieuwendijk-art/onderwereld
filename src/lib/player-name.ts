const HEX = /^#[0-9A-Fa-f]{6}$/;

export function isSafeNameColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX.test(value);
}

export function normalizeNameColor(value: string | null | undefined): string | null {
  if (!isSafeNameColor(value)) return null;
  return value.toLowerCase();
}

export function titlePrefix(title: string | null | undefined) {
  const clean = title?.trim();
  return clean ? `[${clean}]` : "";
}

export function styledDisplayLabel(input: {
  displayName: string;
  selectedTitle?: string | null;
}) {
  const prefix = titlePrefix(input.selectedTitle);
  return prefix ? `${prefix} ${input.displayName}` : input.displayName;
}
