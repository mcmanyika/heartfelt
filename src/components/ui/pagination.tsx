import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
};

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  hrefForPage,
}: PaginationProps) {
  if (total === 0) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-600">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={hrefForPage(Math.max(1, page - 1))}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm",
            page <= 1
              ? "pointer-events-none border-border text-gray-400"
              : "border-border text-navy hover:bg-white",
          )}
          aria-disabled={page <= 1}
        >
          Previous
        </Link>
        <span className="text-sm text-gray-600">
          Page {page} of {pageCount}
        </span>
        <Link
          href={hrefForPage(Math.min(pageCount, page + 1))}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm",
            page >= pageCount
              ? "pointer-events-none border-border text-gray-400"
              : "border-border text-navy hover:bg-white",
          )}
          aria-disabled={page >= pageCount}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
