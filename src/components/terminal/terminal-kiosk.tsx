"use client";

import { useMemo, useState, useTransition } from "react";
import { TerminalMemberField } from "@/components/terminal/terminal-member-field";
import { TerminalReceipt, type TerminalReceiptData } from "@/components/terminal/terminal-receipt";
import { TerminalThemeSwitcher } from "@/components/terminal/terminal-theme-switcher";
import { useTerminalTheme } from "@/components/terminal/use-terminal-theme";
import { simulateTerminalPaymentAction } from "@/lib/services/terminal.actions";
import type { PublicTerminal, TerminalMemberMatch } from "@/lib/services/terminal.service";
import { displayMemberName, formatAmount, paymentMethodLabel, terminalStatusLabel } from "@/lib/utils/format";
import { TERMINAL_PAYMENT_METHODS } from "@/lib/validators/terminal.schema";
import { MVP_CURRENCIES, type MvpCurrency } from "@/types";

const QUICK_AMOUNTS = [10, 20, 50, 100];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

type TerminalKioskProps = {
  terminal: PublicTerminal;
};

export function TerminalKiosk({ terminal }: TerminalKioskProps) {
  const [theme, setTheme] = useTerminalTheme();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<MvpCurrency>("USD");
  const [categoryId, setCategoryId] = useState(terminal.categories[0]?.id ?? "");
  const [method, setMethod] = useState<(typeof TERMINAL_PAYMENT_METHODS)[number]>("CASH");
  const [memberName, setMemberName] = useState("");
  const [selectedMember, setSelectedMember] = useState<TerminalMemberMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TerminalReceiptData | null>(null);
  const [isPending, startTransition] = useTransition();
  const canPay = terminal.status === "ONLINE" && terminal.categories.length > 0;
  const displayAmount = amount || "0";
  const categoryName = useMemo(
    () => terminal.categories.find((category) => category.id === categoryId)?.name ?? "Giving",
    [categoryId, terminal.categories],
  );

  function pressKey(key: (typeof KEYS)[number]) {
    setError(null);
    if (key === "back") {
      setAmount((current) => current.slice(0, -1));
      return;
    }
    if (key === ".") {
      setAmount((current) => (current.includes(".") ? current : `${current || "0"}.`));
      return;
    }
    setAmount((current) => {
      const [whole, fraction] = current.split(".");
      if (current.includes(".") && (fraction?.length ?? 0) >= 2) {
        return current;
      }
      if (!current.includes(".") && whole.length >= 7) {
        return current;
      }
      if (current === "0") {
        return key;
      }
      return `${current}${key}`;
    });
  }

  function clearAll() {
    setAmount("");
    setMemberName("");
    setSelectedMember(null);
    setError(null);
    setReceipt(null);
  }

  function handleMemberNameChange(value: string) {
    setError(null);
    setMemberName(value);
    if (selectedMember && displayMemberName(selectedMember) !== value.trim()) {
      setSelectedMember(null);
    }
  }

  function handleSelectMember(member: TerminalMemberMatch) {
    setSelectedMember(member);
    setMemberName(displayMemberName(member));
    setError(null);
  }

  function processPayment() {
    setError(null);
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const result = await simulateTerminalPaymentAction({
        terminal_code: terminal.terminal_code,
        giving_category_id: categoryId,
        amount: Number(amount).toFixed(2),
        currency,
        payment_method: method,
        member_id: selectedMember?.id ?? "",
        member_name: memberName.trim(),
      });
      if (result.error || !result.transaction_reference) {
        setError(result.error ?? "Payment could not be simulated.");
        return;
      }
      setReceipt({
        reference: result.transaction_reference,
        amount: formatAmount(Number(amount), currency),
        category: categoryName,
        method: paymentMethodLabel(method),
        location: terminal.location_name,
        terminalCode: terminal.terminal_code,
        paidAt: new Date().toISOString(),
        memberName: result.member_name || memberName.trim() || "Guest",
      });
      setAmount("");
      setMemberName("");
      setSelectedMember(null);
    });
  }

  if (receipt) {
    return (
      <TerminalReceipt
        receipt={receipt}
        theme={theme}
        onThemeChange={setTheme}
        onNewGift={clearAll}
      />
    );
  }

  return (
    <div className="terminal-shell" data-theme={theme} suppressHydrationWarning>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-6 sm:px-8">
        <header className="kiosk-hairline flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <p className="kiosk-gold text-[11px] font-semibold tracking-[0.18em] uppercase">
              Heartfelt International Ministries
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{terminal.location_name}</h1>
            <p className="kiosk-muted mt-1 text-sm">
              {terminal.terminal_code} · {terminal.device_name}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                terminal.status === "ONLINE" ? "kiosk-status-ok" : "kiosk-status-off"
              }`}
            >
              {terminalStatusLabel(terminal.status)}
            </span>
            <TerminalThemeSwitcher theme={theme} onChange={setTheme} />
          </div>
        </header>

        {!canPay ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-2xl font-semibold">This terminal is not taking payments</p>
            <p className="kiosk-muted mt-3 max-w-md text-sm leading-6">
              {terminal.categories.length === 0
                ? "Ask Head Office to add an active giving category."
                : "Set the device online from the admin workspace before using the simulator."}
            </p>
          </div>
        ) : (
          <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-5">
              <div className="kiosk-surface rounded-3xl p-5">
                <p className="kiosk-faint text-sm">Amount</p>
                <p className="mt-2 font-mono text-5xl font-semibold tracking-tight">
                  {currency} {displayAmount}
                </p>
              </div>

              <div className="flex gap-2">
                {MVP_CURRENCIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCurrency(value)}
                    className={`min-h-12 flex-1 rounded-xl text-sm font-semibold ${
                      currency === value ? "kiosk-key-active" : "kiosk-key"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className="kiosk-key min-h-12 rounded-xl text-sm font-semibold"
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pressKey(key)}
                    className="kiosk-key min-h-16 rounded-2xl text-2xl font-semibold"
                  >
                    {key === "back" ? "⌫" : key}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <TerminalMemberField
                terminalCode={terminal.terminal_code}
                name={memberName}
                selectedMember={selectedMember}
                disabled={isPending}
                onNameChange={handleMemberNameChange}
                onSelectMember={handleSelectMember}
              />

              <div>
                <p className="kiosk-faint mb-2 text-sm">Giving category</p>
                <div className="flex flex-wrap gap-2">
                  {terminal.categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                        categoryId === category.id ? "kiosk-brand" : "kiosk-key"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="kiosk-faint mb-2 text-sm">Payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  {TERMINAL_PAYMENT_METHODS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMethod(value)}
                      className={`min-h-12 rounded-xl text-sm font-semibold ${
                        method === value ? "kiosk-key-active" : "kiosk-key"
                      }`}
                    >
                      {paymentMethodLabel(value)}
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <p role="alert" className="kiosk-error rounded-xl px-4 py-3 text-sm">
                  {error}
                </p>
              ) : (
                <p className="kiosk-faint text-sm">
                  No live card or mobile money is charged.
                </p>
              )}

              <button
                type="button"
                onClick={processPayment}
                disabled={isPending || !amount || Number(amount) <= 0}
                className="kiosk-brand min-h-14 w-full rounded-2xl text-lg font-semibold disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Process payment"}
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={isPending}
                className="kiosk-outline min-h-12 w-full rounded-2xl text-base font-semibold disabled:opacity-50"
              >
                Clear
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
