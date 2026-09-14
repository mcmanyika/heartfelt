import { ProfileStatusSelect } from "@/components/admin/profile-status-select";
import { UserRolesDialog } from "@/components/admin/user-roles-dialog";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortHeader } from "@/components/ui/sort-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { withQuery } from "@/lib/admin/query-string";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { roleLabel } from "@/lib/auth/permissions";
import { listStaffLocations } from "@/lib/services/member.service";
import { listDirectoryUsers, USER_SORTS } from "@/lib/services/user.service";
import { profileStatusLabel } from "@/lib/utils/format";
import { APP_ROLES, PROFILE_STATUSES } from "@/types";

type UsersPageProps = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const role = APP_ROLES.includes(params.role as (typeof APP_ROLES)[number])
    ? params.role
    : undefined;
  const status = PROFILE_STATUSES.includes(params.status as (typeof PROFILE_STATUSES)[number])
    ? params.status
    : undefined;
  const sort = parseSortColumn(params.sort, USER_SORTS, "name");
  const dir = parseSortDir(params.dir, "asc");
  const [result, staffLocations] = await Promise.all([
    listDirectoryUsers({
      q: params.q,
      role,
      status,
      page: Number(params.page ?? "1") || 1,
      sort,
      dir,
    }),
    listStaffLocations(),
  ]);
  const query = {
    q: params.q,
    role,
    status,
    sort,
    dir,
  };
  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/users", query, { sort: nextSort, dir: nextDir, page: undefined });

  return (
    <>
      <PageHeader title="Users" />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search name or phone" />
        <select name="role" defaultValue={role ?? ""} className={fieldClassName} aria-label="Filter by role">
          <option value="">All roles</option>
          {APP_ROLES.map((value) => (
            <option key={value} value={value}>
              {roleLabel(value)}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className={fieldClassName}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {PROFILE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {profileStatusLabel(value)}
            </option>
          ))}
        </select>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
          Apply filters
        </button>
      </form>

      {"error" in result && result.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <DataTable isEmpty={result.rows.length === 0} emptyTitle="No users match these filters">
        <DataTableHead>
          <tr>
            <SortHeader label="Name" column="name" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Email" column="email" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Campus" column="campus" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Roles" column="roles" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Status" column="status" sort={sort} dir={dir} hrefFor={sortHref} />
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.rows.map((row) => (
            <tr key={row.id} className="text-navy">
              <td className="px-4 py-3">
                <p className="font-medium">{row.name}</p>
                {row.phone ? <p className="text-xs text-gray-500">{row.phone}</p> : null}
              </td>
              <td className="px-4 py-3">{row.email}</td>
              <td className="px-4 py-3">{row.campus}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {row.roles.map((label) => (
                      <StatusBadge key={label} status="ACTIVE" label={label} />
                    ))}
                  </div>
                  <UserRolesDialog
                    userId={row.id}
                    userName={row.name}
                    assignments={row.assignments}
                    locations={staffLocations.locations}
                    lockSuperAdmin={row.id === result.currentUserId}
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <ProfileStatusSelect
                  userId={row.id}
                  status={row.status}
                  disabled={row.id === result.currentUserId}
                />
              </td>
            </tr>
          ))}
        </DataTableBody>
      </DataTable>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={result.pageSize}
        hrefForPage={(page) => withQuery("/admin/users", query, { page: page > 1 ? String(page) : undefined })}
      />
    </>
  );
}
