"use client";

import { useEffect } from "react";
import { TerminalBrand } from "@/components/terminal/terminal-brand";
import { TerminalThemeSwitcher } from "@/components/terminal/terminal-theme-switcher";
import type { TerminalTheme } from "@/lib/terminal-theme";

export type TerminalReceiptLine = {
  reference: string;
  amount: string;
  category: string;
  note?: string;
};

export type TerminalReceiptData = {
  lines: TerminalReceiptLine[];
  totals: string;
  method: string;
  receiptCode?: string;
  location: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  terminalCode: string;
  paidAt: string;
  memberName: string;
};

function formatReceiptDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

type TerminalReceiptProps = {
  receipt: TerminalReceiptData;
  theme: TerminalTheme;
  onThemeChange: (theme: TerminalTheme) => void;
  onNewGift: () => void;
};

export function TerminalReceipt({
  receipt,
  theme,
  onThemeChange,
  onNewGift,
}: TerminalReceiptProps) {
  const giftCount = receipt.lines.length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.print();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [receipt.lines]);

  return (
    <div className="terminal-shell" data-theme={theme} suppressHydrationWarning>
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-10">
        <div className="terminal-print-hide flex justify-end">
          <TerminalThemeSwitcher theme={theme} onChange={onThemeChange} />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="terminal-print-hide kiosk-gold text-sm font-semibold tracking-[0.2em] uppercase">
            {giftCount > 1 ? "Payments received" : "Payment received"}
          </p>

          <article className="terminal-receipt-slip mt-6 w-full max-w-sm rounded-2xl px-6 py-7">
            <div className="flex justify-center">
              <TerminalBrand
                src={receipt.organizationLogoUrl}
                name={receipt.organizationName}
                className="h-16"
                imageClassName="max-h-14 max-w-[200px]"
              />
            </div>
            <h2 className="mt-3 text-center text-lg font-semibold">{receipt.location}</h2>
            <p className="mt-1 text-center text-xs opacity-80">
              {giftCount > 1 ? `Giving receipt · ${giftCount} gifts` : "Giving receipt"}
            </p>

            <p className="mt-6 text-center font-mono text-3xl font-semibold tracking-tight">
              {receipt.totals}
            </p>

            {giftCount > 1 ? (
              <ul className="mt-6 space-y-3 text-sm">
                {receipt.lines.map((line) => (
                  <li key={line.reference} className="border-t border-current/20 pt-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="opacity-70">
                        {line.category}
                        {line.note ? <span className="mt-1 block text-xs">{line.note}</span> : null}
                      </span>
                      <span className="font-medium">{line.amount}</span>
                    </div>
                    <p className="mt-1 break-all text-right font-mono text-xs opacity-70">{line.reference}</p>
                  </li>
                ))}
              </ul>
            ) : null}

            <dl className="mt-6 space-y-3 text-sm">
              <ReceiptRow label="Member" value={receipt.memberName} />
              {giftCount === 1 ? (
                <>
                  <ReceiptRow label="Category" value={receipt.lines[0]?.category ?? "Giving"} />
                  {receipt.lines[0]?.note ? <ReceiptRow label="Note" value={receipt.lines[0].note} /> : null}
                  <ReceiptRow label="Reference" value={receipt.lines[0]?.reference ?? "—"} mono />
                </>
              ) : null}
              <ReceiptRow label="Payment method" value={receipt.method} />
              {receipt.receiptCode ? (
                <ReceiptRow label="Receipt code" value={receipt.receiptCode} mono />
              ) : null}
              <ReceiptRow label="Date" value={formatReceiptDate(receipt.paidAt)} />
              <ReceiptRow label="Terminal" value={receipt.terminalCode} />
            </dl>

            <p className="mt-6 text-center text-xs leading-5 opacity-80">
              Thank you for giving. Keep this receipt for your records.
            </p>
          </article>

          <p className="terminal-print-hide kiosk-faint mt-4 text-center text-sm">
            This is a simulated gift. No live payment was taken.
          </p>

          <div className="terminal-print-hide mt-8 grid w-full gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="kiosk-brand min-h-14 w-full rounded-2xl text-lg font-semibold"
            >
              Print receipt
            </button>
            <button
              type="button"
              onClick={onNewGift}
              className="kiosk-outline min-h-12 w-full rounded-2xl text-base font-semibold"
            >
              New gift
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-current/20 pt-3">
      <dt className="shrink-0 opacity-70">{label}</dt>
      <dd className={`text-right ${mono ? "break-all font-mono text-xs" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
