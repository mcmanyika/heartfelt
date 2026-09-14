import { DataTable, DataTableBody, DataTableHead } from "@/components/ui/data-table";

type ReportTableProps = {
  title: string;
  empty: string;
  headers: string[];
  rows: string[][];
};

export function ReportTable({ title, empty, headers, rows }: ReportTableProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-navy">{title}</h2>
      <DataTable isEmpty={rows.length === 0} emptyTitle={empty}>
        <DataTableHead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="text-navy">
              {row.map((cell, index) => (
                <td key={`${row[0]}-${index}`} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </DataTableBody>
      </DataTable>
    </section>
  );
}
