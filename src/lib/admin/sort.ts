export type SortDir = "asc" | "desc";

export function parseSortDir(value?: string, fallback: SortDir = "desc"): SortDir {
  if (value === "asc" || value === "desc") {
    return value;
  }
  return fallback;
}

export function parseSortColumn<T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  return allowed.includes(value as T[number]) ? (value as T[number]) : fallback;
}

export function nextSortDir(active: boolean, current: SortDir, defaultDir: SortDir = "asc"): SortDir {
  if (!active) {
    return defaultDir;
  }
  return current === "asc" ? "desc" : "asc";
}
