export const TERMINAL_THEMES = ["night", "day", "contrast"] as const;

export type TerminalTheme = (typeof TERMINAL_THEMES)[number];

export const TERMINAL_THEME_STORAGE_KEY = "heartfelt.terminal-theme";

export const TERMINAL_THEME_LABELS: Record<TerminalTheme, string> = {
  night: "Night",
  day: "Day",
  contrast: "High contrast",
};

export function isTerminalTheme(value: unknown): value is TerminalTheme {
  return TERMINAL_THEMES.includes(value as TerminalTheme);
}
