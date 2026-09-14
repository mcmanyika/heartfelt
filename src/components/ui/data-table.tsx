import { EmptyState } from "@/components/ui/empty-state";

type DataTableProps = {
  children: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  isEmpty?: boolean;
};

export function DataTable({
  children,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  isEmpty = false,
}: DataTableProps) {
  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-border bg-background text-xs font-medium tracking-wide text-gray-500 uppercase">
      {children}
    </thead>
  );
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}
