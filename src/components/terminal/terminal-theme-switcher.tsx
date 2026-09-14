"use client";

import {
  TERMINAL_THEMES,
  TERMINAL_THEME_LABELS,
  type TerminalTheme,
} from "@/lib/terminal-theme";

type TerminalThemeSwitcherProps = {
  theme: TerminalTheme;
  onChange: (theme: TerminalTheme) => void;
};

export function TerminalThemeSwitcher({ theme, onChange }: TerminalThemeSwitcherProps) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="kiosk-faint mb-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
        Display
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {TERMINAL_THEMES.map((value) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(value)}
              className={`min-h-10 rounded-full px-3 text-xs font-semibold ${
                selected ? "kiosk-key-active" : "kiosk-key"
              }`}
            >
              {TERMINAL_THEME_LABELS[value]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
