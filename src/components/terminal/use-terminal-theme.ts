"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  TERMINAL_THEME_STORAGE_KEY,
  isTerminalTheme,
  type TerminalTheme,
} from "@/lib/terminal-theme";

const listeners = new Set<() => void>();

function emitThemeChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readTheme(): TerminalTheme {
  const stored = window.localStorage.getItem(TERMINAL_THEME_STORAGE_KEY);
  return isTerminalTheme(stored) ? stored : "night";
}

function getServerTheme(): TerminalTheme {
  return "night";
}

export function useTerminalTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerTheme);

  const setTheme = useCallback((next: TerminalTheme) => {
    window.localStorage.setItem(TERMINAL_THEME_STORAGE_KEY, next);
    emitThemeChange();
  }, []);

  return [theme, setTheme] as const;
}
