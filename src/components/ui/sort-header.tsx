import Link from "next/link";
import { nextSortDir, type SortDir } from "@/lib/admin/sort";
import { cn } from "@/lib/utils/cn";

type SortHeaderProps = {
  label: string;
  column: string;
  sort: string;
  dir: SortDir;
  hrefFor: (sort: string, dir: SortDir) => string;
  defaultDir?: SortDir;
};

export function SortHeader({
  label,
  column,
  sort,
  dir,
  hrefFor,
  defaultDir = "asc",
}: SortHeaderProps) {
  const active = sort === column;
  const nextDir = nextSortDir(active, dir, defaultDir);

  return (
    <th className="px-4 py-3" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={hrefFor(column, nextDir)}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap hover:text-navy",
          active && "text-navy",
        )}
      >
        {label}
        <span aria-hidden className="text-[10px] leading-none">
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}
