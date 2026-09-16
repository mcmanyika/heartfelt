import { formatAmount } from "@/lib/utils/format";

type GivingTotal = {
  currency: string;
  amount: number;
};

type GivingTotalsValueProps = {
  totals: GivingTotal[];
};

function sortedTotals(totals: GivingTotal[]) {
  return [...totals].sort((left, right) => right.amount - left.amount || left.currency.localeCompare(right.currency));
}

export function GivingTotalsValue({ totals }: GivingTotalsValueProps) {
  const rows = sortedTotals(totals);
  if (rows.length === 0) {
    return "—";
  }

  if (rows.length === 1) {
    return formatAmount(rows[0].amount, rows[0].currency);
  }

  return (
    <ul className="space-y-1.5 text-base leading-tight">
      {rows.map((total) => (
        <li key={total.currency} className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium tracking-wide text-gray-500">{total.currency}</span>
          <span className="text-lg font-semibold tabular-nums tracking-tight text-navy">
            {total.amount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}
