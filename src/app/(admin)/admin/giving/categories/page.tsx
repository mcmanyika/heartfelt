import Link from "next/link";
import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";
import { fieldClassName } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseListPage } from "@/lib/admin/list-page";
import { withQuery } from "@/lib/admin/query-string";
import { requireRole } from "@/lib/auth/require-role";
import { listGivingCategories } from "@/lib/services/giving.service";

type CategoriesPageProps = {
  searchParams: Promise<{ q?: string; active?: string; page?: string }>;
};

export default async function GivingCategoriesPage({ searchParams }: CategoriesPageProps) {
  await requireRole("SUPER_ADMIN");
  const params = await searchParams;
  const active = params.active === "yes" || params.active === "no" ? params.active : "";
  const result = await listGivingCategories({
    q: params.q,
    active,
    page: parseListPage(params.page),
  });
  const query = { q: params.q, active: active || undefined };

  return (
    <>
      <PageHeader
        title="Giving categories"
        description="Organization-wide categories used when recording giving. Only Super Admins can change these."
        actions={
          <Link
            href="/admin/giving/categories/new"
            className="rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white"
          >
            Add category
          </Link>
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <SearchInput defaultValue={params.q} placeholder="Search name or description" />
        <select name="active" defaultValue={active} className={fieldClassName} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="yes">Active</option>
          <option value="no">Inactive</option>
        </select>
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

      <DataTable isEmpty={result.categories.length === 0} emptyTitle="No categories match these filters">
        <DataTableHead>
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {result.categories.map((category) => (
            <tr key={category.id} className="text-navy">
              <td className="px-4 py-3 font-medium">{category.name}</td>
              <td className="px-4 py-3">{category.description || "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge
                  status={category.active ? "ACTIVE" : "INACTIVE"}
                  label={category.active ? "Active" : "Inactive"}
                />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/giving/categories/${category.id}/edit`}
                  className="text-sm font-medium text-maroon hover:underline"
                >
                  Edit
                </Link>
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
        hrefForPage={(page) => withQuery("/admin/giving/categories", query, { page: String(page) })}
      />
    </>
  );
}
