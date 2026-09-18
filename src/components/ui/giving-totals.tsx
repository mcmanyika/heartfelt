import { formatAmount } from "@/lib/utils/format";

type GivingTotal = {
  currency: string;
  amount: number;
};

type GivingTotalsValueProps = {
  totals: GivingTotal[];
  layout?: "stack" | "columns";
};

function sortedTotals(totals: GivingTotal[]) {
  return [...totals].sort((left, right) => right.amount - left.amount || left.currency.localeCompare(right.currency));
}

function formatTotalAmount(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function GivingTotalsValue({ totals, layout = "stack" }: GivingTotalsValueProps) {
  const rows = sortedTotals(totals);
  if (rows.length === 0) {
    return "—";
  }

  if (rows.length === 1) {
    return formatAmount(rows[0].amount, rows[0].currency);
  }

  if (layout === "columns") {
    return (
      <ul className="flex flex-wrap">
        {rows.map((total, index) => (
          <li
            key={total.currency}
            className={index === 0 ? "pr-8" : "border-l border-border px-8"}
          >
            <p className="text-[11px] font-medium tracking-wide text-gray-500">{total.currency}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-navy">
              {formatTotalAmount(total.amount)}
            </p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-1 text-lg leading-tight">
      {rows.map((total) => (
        <li key={total.currency} className="flex items-baseline gap-2">
          <span className="w-8 shrink-0 text-xs font-medium tracking-wide text-gray-500">{total.currency}</span>
          <span className="font-semibold tabular-nums tracking-tight text-navy">{formatTotalAmount(total.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
