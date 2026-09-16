import Link from "next/link";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SortHeader } from "@/components/ui/sort-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { withQuery } from "@/lib/admin/query-string";
import { parseListPage } from "@/lib/admin/list-page";
import { parseSortColumn, parseSortDir } from "@/lib/admin/sort";
import { requireRole } from "@/lib/auth/require-role";
import {
  canMutateDepartment,
  DEPARTMENT_ROLES,
  DEPARTMENT_SORTS,
  listDepartments,
} from "@/lib/services/department.service";
import { DEPARTMENT_STATUSES, type DepartmentStatusFilter } from "@/lib/validators/department.schema";
import type { DepartmentStatus } from "@/types";

type DepartmentsPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    status?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminDepartmentsPage({ searchParams }: DepartmentsPageProps) {
  const current = await requireRole(DEPARTMENT_ROLES);
  const params = await searchParams;
  const status: DepartmentStatusFilter =
    params.status === "all" || DEPARTMENT_STATUSES.includes(params.status as DepartmentStatus)
      ? (params.status as DepartmentStatusFilter)
      : "ACTIVE";
  const sort = parseSortColumn(params.sort, DEPARTMENT_SORTS, "name");
  const dir = parseSortDir(params.dir, "asc");
  const result = await listDepartments({
    q: params.q,
    locationId: current.isSuperAdmin ? params.location : undefined,
    status,
    page: parseListPage(params.page),
    sort,
    dir,
  });
  const query = {
    q: params.q,
    location: current.isSuperAdmin ? params.location : undefined,
    status,
    sort,
    dir,
  };
  const sortHref = (nextSort: string, nextDir: typeof dir) =>
    withQuery("/admin/departments", query, { sort: nextSort, dir: nextDir, page: undefined });

  return (
    <>
      <PageHeader
        title="Departments"
        actions={
          <Link href="/admin/departments/new" className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white">
            Add department
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search name, code, or venue" />
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
        <select name="status" defaultValue={status} className={fieldClassName} aria-label="Filter by status">
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="all">All statuses</option>
        </select>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <div>
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </div>
      </form>

      {result.error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <DataTable isEmpty={result.departments.length === 0} emptyTitle="No departments match these filters">
        <DataTableHead>
          <tr>
            <SortHeader label="Department" column="name" sort={sort} dir={dir} hrefFor={sortHref} />
            <SortHeader label="Campus" column="location" sort={sort} dir={dir} hrefFor={sortHref} />
            <th className="px-4 py-3">Members</th>
            <SortHeader label="Status" column="status" sort={sort} dir={dir} hrefFor={sortHref} />
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.departments.map((department) => (
            <tr key={department.id} className="text-navy">
              <td className="px-4 py-3">
                <p className="font-medium">{department.name}</p>
                <p className="text-xs text-gray-500">
                  {department.leader_name ? `Led by ${department.leader_name}` : "No leader"}
                </p>
              </td>
              <td className="px-4 py-3">
                {department.location_name} ({department.location_code})
              </td>
              <td className="px-4 py-3">{department.member_count}</td>
              <td className="px-4 py-3">
                <StatusBadge status={department.status} label={department.status === "ACTIVE" ? "Active" : "Inactive"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/admin/departments/${department.id}`}
                    className="text-sm font-medium text-maroon hover:underline"
                  >
                    View
                  </Link>
                  {canMutateDepartment(current, department.location_id) ? (
                    <Link
                      href={`/admin/departments/${department.id}/edit`}
                      className="text-sm font-medium text-maroon hover:underline"
                    >
                      Edit
                    </Link>
                  ) : null}
                </div>
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
        hrefForPage={(page) => withQuery("/admin/departments", query, { page: String(page) })}
      />
    </>
  );
}
