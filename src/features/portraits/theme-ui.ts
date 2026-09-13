export interface ThemeUi {
  name: string;
  icon: string;
  order?: number;
}

export interface ThemeUiConfiguration {
  schemaVersion: 1;
  pools: Record<string, ThemeUi>;
  aliases: Record<string, string>;
}

export const THEME_UI: Readonly<Record<string, ThemeUi>> = Object.freeze({
  default: { name: "普通", icon: "常" },
  female: { name: "性转", icon: "♀️" },
  special: { name: "心动", icon: "💖" },
  wedding: { name: "婚纱", icon: "👰" },
  tarot: { name: "塔罗", icon: "🔮" },
  swimsuit: { name: "泳装", icon: "👙" },
  nai: { name: "Nai", icon: "🥛" },
});

let remoteThemeUi: Record<string, ThemeUi> = {};
let remoteThemeAliases: Record<string, string> = {};

function normalizeThemeUiKey(theme: unknown): string {
  const normalized = String(theme ?? "").trim().toLowerCase();
  return normalized === "normal" ? "default" : normalized;
}

export function setThemeUiConfiguration(
  configuration: Pick<ThemeUiConfiguration, "pools" | "aliases">,
): void {
  remoteThemeUi = Object.fromEntries(
    Object.entries(configuration.pools ?? {}).map(([key, value]) => [
      normalizeThemeUiKey(key),
      { ...value },
    ]),
  );
  remoteThemeAliases = Object.fromEntries(
    Object.entries(configuration.aliases ?? {}).map(([alias, target]) => [
      normalizeThemeUiKey(alias),
      normalizeThemeUiKey(target),
    ]),
  );
}

export function resetThemeUiConfiguration(): void {
  remoteThemeUi = {};
  remoteThemeAliases = {};
}

function resolveThemeUiKey(theme: unknown): string {
  let resolved = normalizeThemeUiKey(theme);
  const visited = new Set<string>();
  while (remoteThemeAliases[resolved] && !visited.has(resolved)) {
    visited.add(resolved);
    resolved = normalizeThemeUiKey(remoteThemeAliases[resolved]);
  }
  return resolved;
}

export function getThemeUi(theme: string): ThemeUi {
  const resolved = resolveThemeUiKey(theme);
  return remoteThemeUi[resolved]
    ?? THEME_UI[resolved]
    ?? { name: String(theme || resolved), icon: "🖼️" };
}
