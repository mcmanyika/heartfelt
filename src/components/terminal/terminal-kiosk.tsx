"use client";

import { useMemo, useState, useTransition } from "react";
import { TerminalBrand } from "@/components/terminal/terminal-brand";
import { TerminalMemberField } from "@/components/terminal/terminal-member-field";
import { TerminalOtherNoteDialog } from "@/components/terminal/terminal-other-note-dialog";
import { TerminalPromptDialog } from "@/components/terminal/terminal-prompt-dialog";
import { TerminalReceipt, type TerminalReceiptData } from "@/components/terminal/terminal-receipt";
import { TerminalThemeSwitcher } from "@/components/terminal/terminal-theme-switcher";
import { useTerminalTheme } from "@/components/terminal/use-terminal-theme";
import { simulateTerminalBatchPaymentAction } from "@/lib/services/terminal.actions";
import type { PublicTerminal, TerminalMemberMatch } from "@/lib/services/terminal.service";
import { displayMemberName, formatAmount, formatTotals, terminalStatusLabel } from "@/lib/utils/format";
import {
  isOtherGivingCategory,
  TERMINAL_CARD_CHANNELS,
  TERMINAL_PAYMENT_METHODS,
  terminalCardChannelLabel,
  terminalPaymentDisplay,
  type TerminalCardChannel,
  type TerminalPaymentMethod,
} from "@/lib/validators/terminal.schema";
import { MVP_CURRENCIES, type MvpCurrency } from "@/types";

const QUICK_AMOUNTS = [10, 20, 50, 100];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

type CartItem = {
  key: string;
  amount: string;
  currency: MvpCurrency;
  categoryId: string;
  categoryName: string;
  notes: string;
};

type TerminalKioskProps = {
  terminal: PublicTerminal;
};

function cartTotals(items: CartItem[]) {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + Number(item.amount));
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

export function TerminalKiosk({ terminal }: TerminalKioskProps) {
  const [theme, setTheme] = useTerminalTheme();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<MvpCurrency>("USD");
  const [categoryId, setCategoryId] = useState(terminal.categories[0]?.id ?? "");
  const [method, setMethod] = useState<TerminalPaymentMethod>("CASH");
  const [cardChannel, setCardChannel] = useState<TerminalCardChannel | null>(null);
  const [receiptCode, setReceiptCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [selectedMember, setSelectedMember] = useState<TerminalMemberMatch | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryNote, setCategoryNote] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [receiptCodeModalOpen, setReceiptCodeModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TerminalReceiptData | null>(null);
  const [isPending, startTransition] = useTransition();
  const canPay = terminal.status === "ONLINE" && terminal.categories.length > 0;
  const displayAmount = amount || "0";
  const categoryName = useMemo(
    () => terminal.categories.find((category) => category.id === categoryId)?.name ?? "Giving",
    [categoryId, terminal.categories],
  );
  const otherSelected = isOtherGivingCategory(categoryName);
  const pendingAmount = Number(amount) > 0;
  const checkoutItems = pendingAmount
    ? [
        ...cart,
        {
          key: "current",
          amount: Number(amount).toFixed(2),
          currency,
          categoryId,
          categoryName,
          notes: otherSelected ? categoryNote : "",
        },
      ]
    : cart;
  const checkoutCount = checkoutItems.length;

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
    setMethod("CASH");
    setCardChannel(null);
    setReceiptCode("");
    setMemberName("");
    setSelectedMember(null);
    setCart([]);
    setCategoryNote("");
    setNoteModalOpen(false);
    setReceiptCodeModalOpen(false);
    setError(null);
    setReceipt(null);
  }

  function selectMethod(value: TerminalPaymentMethod) {
    setError(null);
    setMethod(value);
    if (value === "CASH") {
      setCardChannel(null);
      setReceiptCode("");
      setReceiptCodeModalOpen(false);
    }
  }

  function selectCardChannel(channel: TerminalCardChannel) {
    setError(null);
    setMethod("CARD");
    setCardChannel(channel);
    if (channel === "CBZ") {
      setReceiptCodeModalOpen(true);
      return;
    }
    setReceiptCode("");
    setReceiptCodeModalOpen(false);
  }

  function selectCategory(category: { id: string; name: string }) {
    setError(null);
    setCategoryId(category.id);
    if (isOtherGivingCategory(category.name)) {
      setNoteModalOpen(true);
      return;
    }
    setCategoryNote("");
  }

  function currentGiftNeedsNote() {
    return otherSelected && !categoryNote.trim();
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

  function addCurrentGift() {
    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount to add another gift.");
      return;
    }
    if (!categoryId) {
      setError("Select a giving category.");
      return;
    }
    if (currentGiftNeedsNote()) {
      setNoteModalOpen(true);
      return;
    }
    setError(null);
    setCart((current) => [
      ...current,
      {
        key: `${Date.now()}-${current.length}`,
        amount: Number(amount).toFixed(2),
        currency,
        categoryId,
        categoryName,
        notes: otherSelected ? categoryNote.trim() : "",
      },
    ]);
    setAmount("");
  }

  function processPayment() {
    if (checkoutCount === 0) {
      setError("Add at least one gift.");
      return;
    }
    if (pendingAmount && currentGiftNeedsNote()) {
      setNoteModalOpen(true);
      return;
    }
    if (method === "CARD" && !cardChannel) {
      setError("Choose a card option.");
      return;
    }
    if (cardChannel === "CBZ" && !receiptCode.trim()) {
      setReceiptCodeModalOpen(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const result = await simulateTerminalBatchPaymentAction({
        terminal_code: terminal.terminal_code,
        payment_method: method,
        card_channel: cardChannel ?? undefined,
        receipt_code: receiptCode.trim(),
        member_id: selectedMember?.id ?? "",
        member_name: memberName.trim(),
        items: checkoutItems.map((item) => ({
          giving_category_id: item.categoryId,
          amount: item.amount,
          currency: item.currency,
          notes: item.notes,
        })),
      });
      if (result.error || result.items.length === 0) {
        setError(result.error ?? "Payment could not be simulated.");
        return;
      }

      const remaining = [...checkoutItems];
      setReceipt({
        lines: result.items.map((item) => {
          const matchIndex = remaining.findIndex(
            (line) =>
              line.categoryId === item.giving_category_id &&
              line.currency === item.currency &&
              Number(line.amount) === Number(item.amount),
          );
          const match = matchIndex >= 0 ? remaining.splice(matchIndex, 1)[0] : null;
          return {
            reference: item.transaction_reference,
            amount: formatAmount(Number(item.amount), item.currency),
            category: match?.categoryName ?? "Giving",
            note: match?.notes || undefined,
          };
        }),
        totals: formatTotals(cartTotals(checkoutItems)),
        method: terminalPaymentDisplay(method, cardChannel),
        receiptCode: cardChannel === "CBZ" ? receiptCode.trim() : undefined,
        location: terminal.location_name,
        organizationName: terminal.organization_name,
        organizationLogoUrl: terminal.organization_logo_url,
        terminalCode: terminal.terminal_code,
        paidAt: new Date().toISOString(),
        memberName: result.member_name || memberName.trim() || "Guest",
      });
      setAmount("");
      setMemberName("");
      setSelectedMember(null);
      setCart([]);
      setCategoryNote("");
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
            <TerminalBrand src={terminal.organization_logo_url} name={terminal.organization_name} />
            <h1 className="mt-3 text-2xl font-semibold">{terminal.location_name}</h1>
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
                      onClick={() => selectCategory(category)}
                      className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                        categoryId === category.id ? "kiosk-brand" : "kiosk-key"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                {otherSelected && categoryNote ? (
                  <button
                    type="button"
                    className="kiosk-muted mt-3 text-left text-sm"
                    onClick={() => setNoteModalOpen(true)}
                  >
                    Note: {categoryNote}
                  </button>
                ) : null}
              </div>

              {cart.length > 0 ? (
                <div className="kiosk-surface rounded-2xl p-4">
                  <p className="kiosk-faint text-sm">Gifts in this checkout</p>
                  <ul className="mt-3 space-y-2">
                    {cart.map((item) => (
                      <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
                        <span>
                          {item.categoryName}
                          {item.notes ? <span className="kiosk-faint"> · {item.notes}</span> : null}
                          <span className="kiosk-faint ml-2 font-mono">
                            {formatAmount(Number(item.amount), item.currency)}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="kiosk-faint text-sm font-semibold underline-offset-2 hover:underline"
                          disabled={isPending}
                          onClick={() => setCart((current) => current.filter((row) => row.key !== item.key))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 font-mono text-sm font-semibold">{formatTotals(cartTotals(checkoutItems))}</p>
                </div>
              ) : null}

              <div>
                <p className="kiosk-faint mb-2 text-sm">Payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  {TERMINAL_PAYMENT_METHODS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectMethod(value)}
                      className={`min-h-12 rounded-xl text-sm font-semibold ${
                        method === value ? "kiosk-key-active" : "kiosk-key"
                      }`}
                    >
                      {terminalPaymentDisplay(value)}
                    </button>
                  ))}
                </div>
                {method === "CARD" ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TERMINAL_CARD_CHANNELS.map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => selectCardChannel(channel)}
                        className={`min-h-12 rounded-xl text-sm font-semibold ${
                          cardChannel === channel ? "kiosk-key-active" : "kiosk-key"
                        }`}
                      >
                        {terminalCardChannelLabel(channel)}
                      </button>
                    ))}
                  </div>
                ) : null}
                {cardChannel === "CBZ" && receiptCode ? (
                  <button
                    type="button"
                    className="kiosk-muted mt-3 text-left text-sm"
                    onClick={() => setReceiptCodeModalOpen(true)}
                  >
                    Receipt code: {receiptCode}
                  </button>
                ) : null}
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
                onClick={addCurrentGift}
                disabled={isPending || !amount || Number(amount) <= 0}
                className="kiosk-outline min-h-12 w-full rounded-2xl text-base font-semibold disabled:opacity-50"
              >
                Add gift
              </button>
              <button
                type="button"
                onClick={processPayment}
                disabled={isPending || checkoutCount === 0}
                className="kiosk-brand min-h-14 w-full rounded-2xl text-lg font-semibold disabled:opacity-50"
              >
                {isPending
                  ? "Processing..."
                  : checkoutCount > 1
                    ? `Process ${checkoutCount} payments`
                    : "Process payment"}
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
      {noteModalOpen ? (
        <TerminalOtherNoteDialog
          categoryName={categoryName}
          initialNote={categoryNote}
          onSave={(note) => {
            setCategoryNote(note);
            setNoteModalOpen(false);
            setError(null);
          }}
          onClose={() => setNoteModalOpen(false)}
        />
      ) : null}
      {receiptCodeModalOpen ? (
        <TerminalPromptDialog
          title="CBZ receipt code"
          description="Enter the code printed on the CBZ receipt."
          label="Receipt code"
          placeholder="e.g. 48291"
          initialValue={receiptCode}
          saveLabel="Save code"
          onSave={(code) => {
            setReceiptCode(code);
            setReceiptCodeModalOpen(false);
            setError(null);
          }}
          onClose={() => setReceiptCodeModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
