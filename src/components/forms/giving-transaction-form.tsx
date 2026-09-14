"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, fieldClassName } from "@/components/ui/form-field";
import {
  createGivingTransactionAction,
  searchMembersForGivingAction,
} from "@/lib/services/giving.actions";
import type { GivingMemberOption } from "@/lib/services/giving.service";
import { displayMemberName } from "@/lib/utils/format";
import {
  givingTransactionSchema,
  MANUAL_PAYMENT_METHODS,
  type GivingTransactionInput,
} from "@/lib/validators/giving.schema";
import { MVP_CURRENCIES } from "@/types";

type LocationOption = { id: string; name: string; code: string };
type CategoryOption = { id: string; name: string };

type GivingTransactionFormProps = {
  lockLocation: boolean;
  locations: LocationOption[];
  categories: CategoryOption[];
  defaultLocationId: string;
};

export function GivingTransactionForm({
  lockLocation,
  locations,
  categories,
  defaultLocationId,
}: GivingTransactionFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [members, setMembers] = useState<GivingMemberOption[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [isPending, startTransition] = useTransition();
  const [isSearching, startSearch] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<GivingTransactionInput>({
    resolver: zodResolver(givingTransactionSchema),
    defaultValues: {
      anonymous: false,
      member_id: "",
      location_id: defaultLocationId,
      giving_category_id: categories[0]?.id ?? "",
      amount: "",
      currency: "USD",
      payment_method: "CASH",
      transaction_reference: "",
      notes: "",
    },
  });

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === locationId),
    [locations, locationId],
  );

  function onSubmit(values: GivingTransactionInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await createGivingTransactionAction(values);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  }

  function searchMembers() {
    startSearch(async () => {
      const result = await searchMembersForGivingAction(memberQuery, locationId);
      setMembers(result.members);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-3xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
      noValidate
    >
      {serverError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <FormField
        label="Location"
        htmlFor="location_id"
        error={errors.location_id?.message}
        hint={lockLocation ? "Derived from your assigned campus." : undefined}
      >
        {lockLocation ? (
          <>
            <input type="hidden" {...register("location_id")} />
            <p className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-navy">
              {selectedLocation
                ? `${selectedLocation.name} (${selectedLocation.code})`
                : "Assigned location"}
            </p>
          </>
        ) : (
          <select
            id="location_id"
            className={fieldClassName}
            disabled={isPending}
            {...register("location_id", {
              onChange: (event) => {
                setLocationId(event.target.value);
                setValue("member_id", "");
                setMembers([]);
              },
            })}
          >
            <option value="">Select a location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        )}
      </FormField>

      <label className="flex items-center gap-2 text-sm text-navy">
        <input
          type="checkbox"
          disabled={isPending}
          {...register("anonymous", {
            onChange: (event) => {
              setAnonymous(event.target.checked);
              if (event.target.checked) {
                setValue("member_id", "");
              }
            },
          })}
        />
        Anonymous giving
      </label>

      {anonymous ? null : (
        <div className="space-y-3">
          <FormField label="Member" htmlFor="member_id" error={errors.member_id?.message}>
            <select id="member_id" className={fieldClassName} disabled={isPending} {...register("member_id")}>
              <option value="">Select a member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {displayMemberName(member)} · {member.membership_number}
                </option>
              ))}
            </select>
          </FormField>
          <div className="flex gap-2">
            <input
              type="search"
              value={memberQuery}
              onChange={(event) => setMemberQuery(event.target.value)}
              placeholder="Search name or membership number"
              className={fieldClassName}
              aria-label="Search members"
            />
            <button
              type="button"
              onClick={searchMembers}
              disabled={isSearching || isPending || (!lockLocation && !locationId)}
              className="shrink-0 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Giving category" htmlFor="giving_category_id" error={errors.giving_category_id?.message}>
          <select
            id="giving_category_id"
            className={fieldClassName}
            disabled={isPending}
            {...register("giving_category_id")}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Amount" htmlFor="amount" error={errors.amount?.message}>
          <input id="amount" inputMode="decimal" className={fieldClassName} disabled={isPending} {...register("amount")} />
        </FormField>
        <FormField label="Currency" htmlFor="currency" error={errors.currency?.message}>
          <select id="currency" className={fieldClassName} disabled={isPending} {...register("currency")}>
            {MVP_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Payment method" htmlFor="payment_method" error={errors.payment_method?.message}>
          <select
            id="payment_method"
            className={fieldClassName}
            disabled={isPending}
            {...register("payment_method")}
          >
            {MANUAL_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        label="Transaction reference"
        htmlFor="transaction_reference"
        hint="Leave blank to generate HIM-CODE-timestamp."
        error={errors.transaction_reference?.message}
      >
        <input
          id="transaction_reference"
          className={fieldClassName}
          disabled={isPending}
          {...register("transaction_reference")}
        />
      </FormField>
      <FormField label="Notes" htmlFor="notes" error={errors.notes?.message}>
        <input id="notes" className={fieldClassName} disabled={isPending} {...register("notes")} />
      </FormField>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-maroon px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
      >
        {isPending ? "Saving..." : "Record giving"}
      </button>
    </form>
  );
}
