export const LIST_PAGE_SIZE = 4;

export function parseListPage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

export function listRange(page: number, pageSize = LIST_PAGE_SIZE) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function listPageCount(total: number, pageSize = LIST_PAGE_SIZE) {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function searchPattern(query?: string) {
  const search = query?.trim();
  if (!search) {
    return null;
  }
  return `%${search.replace(/,/g, "")}%`;
}
