import { ProfileStatusSelect } from "@/components/admin/profile-status-select";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { withQuery } from "@/lib/admin/query-string";
import { roleLabel } from "@/lib/auth/permissions";
import { listDirectoryUsers, USER_PAGE_SIZE } from "@/lib/services/user.service";
import { profileStatusLabel } from "@/lib/utils/format";
import { APP_ROLES, PROFILE_STATUSES } from "@/types";

type UsersPageProps = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
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
  const result = await listDirectoryUsers({
    q: params.q,
    role,
    status,
    page: Number(params.page ?? "1") || 1,
  });
  const query = {
    q: params.q,
    role,
    status,
  };
  const pageCount = Math.max(1, Math.ceil(result.total / USER_PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Users"
        description="Review accounts, roles, and campus assignments. Status changes are Super Admin only and are written to the audit log. New Auth users are created outside this screen."
      />

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
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Campus</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">Status</th>
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
                <div className="flex flex-wrap gap-1">
                  {row.roles.map((label) => (
                    <StatusBadge key={label} status="ACTIVE" label={label} />
                  ))}
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
        pageCount={pageCount}
        total={result.total}
        pageSize={USER_PAGE_SIZE}
        hrefForPage={(page) => withQuery("/admin/users", query, { page: page > 1 ? String(page) : undefined })}
      />
    </>
  );
}
