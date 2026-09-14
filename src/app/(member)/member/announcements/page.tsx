import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { LIST_PAGE_SIZE, listPageCount, parseListPage } from "@/lib/admin/list-page";
import { withQuery } from "@/lib/admin/query-string";
import { listMyAnnouncements } from "@/lib/services/portal.service";
import { formatDateTime } from "@/lib/utils/format";

type MemberAnnouncementsPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function MemberAnnouncementsPage({ searchParams }: MemberAnnouncementsPageProps) {
  const params = await searchParams;
  const page = parseListPage(params.page);
  const all = await listMyAnnouncements();
  const q = params.q?.trim().toLowerCase() ?? "";
  const matches = q
    ? all.filter((item) => `${item.title} ${item.message} ${item.location_name ?? ""}`.toLowerCase().includes(q))
    : all;
  const pageCount = listPageCount(matches.length);
  const announcements = matches.slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Current notices from Head Office and your campus."
      />
      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-3">
        <SearchInput defaultValue={params.q} placeholder="Search title or message" />
        <div>
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>
      {announcements.length === 0 ? (
        <EmptyState
          title="No announcements"
          description="Published notices that have not expired will appear here."
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                {item.location_name ?? "All locations"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-navy">{item.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{formatDateTime(item.publish_date)}</p>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.message}</p>
            </article>
          ))}
        </div>
      )}
      <Pagination
        page={Math.min(page, pageCount)}
        pageCount={pageCount}
        total={matches.length}
        pageSize={LIST_PAGE_SIZE}
        hrefForPage={(next) => withQuery("/member/announcements", { q: params.q }, { page: String(next) })}
      />
    </>
  );
}
