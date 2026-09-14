import Link from "next/link";
import { MemberDeactivateButton } from "@/components/admin/member-deactivate-button";
import { MemberTransferDialog } from "@/components/admin/member-transfer-dialog";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortHeader } from "@/components/ui/sort-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { withQuery } from "@/lib/admin/query-string";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { fieldClassName } from "@/components/ui/form-field";
import { requireRole } from "@/lib/auth/require-role";
import { listMembers, listStaffLocations, MEMBER_SORTS } from "@/lib/services/member.service";
import { displayMemberName, formatDate, membershipStatusLabel } from "@/lib/utils/format";
import { MEMBERSHIP_STATUSES } from "@/lib/validators/member.schema";
import type { MembershipStatus } from "@/types";

type MembersPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    status?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminMembersPage({ searchParams }: MembersPageProps) {
  const current = await requireRole(["SUPER_ADMIN", "LOCATION_ADMIN"]);
  const params = await searchParams;
  const status = MEMBERSHIP_STATUSES.includes(params.status as MembershipStatus)
    ? (params.status as MembershipStatus)
    : "";
  const sort = parseSortColumn(params.sort, MEMBER_SORTS, "date_joined");
  const dir = parseSortDir(params.dir, "desc");

  const result = await listMembers({
    q: params.q,
    locationId: current.isSuperAdmin ? params.location : undefined,
    status,
    page: Number(params.page ?? "1") || 1,
    sort,
    dir,
  });

  const query = {
    q: params.q,
    location: current.isSuperAdmin ? params.location : undefined,
    status: status || undefined,
    sort,
    dir,
  };
  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/members", query, { sort: nextSort, dir: nextDir, page: undefined });

  const staffLocations = (await listStaffLocations()).locations;

  return (
    <>
      <PageHeader
        title="Members"
        actions={
          <Link
            href="/admin/members/new"
            className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
          >
            Add member
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput
          defaultValue={params.q}
          placeholder="Search number, name, email, or phone"
        />
        {current.isSuperAdmin ? (
          <select
            name="location"
            defaultValue={params.location ?? result.locationId ?? ""}
            className={fieldClassName}
            aria-label="Filter by location"
          >
            <option value="">All locations</option>
            {current.accessibleLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        ) : null}
        <select
          name="status"
          defaultValue={status}
          className={fieldClassName}
          aria-label="Filter by membership status"
        >
          <option value="">All statuses</option>
          {MEMBERSHIP_STATUSES.map((value) => (
            <option key={value} value={value}>
              {membershipStatusLabel(value)}
            </option>
          ))}
        </select>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <div className="md:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
            Apply filters
          </button>
        </div>
      </form>

      {result.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <DataTable
        isEmpty={result.members.length === 0}
        emptyTitle="No members match these filters"
      >
        <DataTableHead>
          <tr>
            <SortHeader
              label="Membership number"
              column="membership_number"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
            />
            <SortHeader label="Name" column="name" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Location" column="location" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Phone" column="phone" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Email" column="email" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Status" column="status" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader
              label="Date joined"
              column="date_joined"
              sort={sort}
              dir={dir}
              hrefFor={sortHref}
              defaultDir="desc"
            />
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.members.map((member) => {
            const name = displayMemberName(member);
            return (
              <tr key={member.id} className="text-navy">
                <td className="px-4 py-3 font-medium">{member.membership_number}</td>
                <td className="px-4 py-3">{name}</td>
                <td className="px-4 py-3">
                  {member.location_name} ({member.location_code})
                </td>
                <td className="px-4 py-3">{member.phone || "—"}</td>
                <td className="px-4 py-3">{member.email || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={member.membership_status}
                    label={membershipStatusLabel(member.membership_status)}
                  />
                </td>
                <td className="px-4 py-3">{formatDate(member.date_joined)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/admin/members/${member.id}`} className="text-sm font-medium text-maroon hover:underline">
                      View
                    </Link>
                    <Link
                      href={`/admin/members/${member.id}/edit`}
                      className="text-sm font-medium text-maroon hover:underline"
                    >
                      Edit
                    </Link>
                    <MemberTransferDialog
                      memberId={member.id}
                      memberName={name}
                      destinations={staffLocations.filter(
                        (location) => location.id !== member.location_id,
                      )}
                    />
                    {member.membership_status !== "INACTIVE_MEMBER" ? (
                      <MemberDeactivateButton memberId={member.id} memberName={name} />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTableBody>
      </DataTable>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        hrefForPage={(page) => withQuery("/admin/members", query, { page: String(page) })}
      />
    </>
  );
}
