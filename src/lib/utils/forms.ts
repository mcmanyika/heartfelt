import type { ZodError } from "zod";

export function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function firstZodError(error: ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

export function userSafeDatabaseError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("organizations_slug") || normalized.includes("organizations_short_code")) {
    return "That church address or code is already taken.";
  }

  if (normalized.includes("locations_organization_id_code")) {
    return "A location with this code already exists.";
  }

  if (normalized.includes("user_roles_unique")) {
    return "That role is already assigned.";
  }

  if (normalized.includes("members_organization_id_membership_number")) {
    return "A member with this membership number already exists.";
  }

  if (normalized.includes("giving_transactions_organization_id_transaction_reference")) {
    return "A transaction with this reference already exists.";
  }

  if (normalized.includes("giving_categories_organization_id_name")) {
    return "A giving category with this name already exists.";
  }

  if (normalized.includes("payment_terminals_organization_id_terminal_code")) {
    return "A terminal with this code already exists.";
  }

  if (normalized.includes("not permitted") || normalized.includes("invalid destination")) {
    return "You do not have access to complete that action.";
  }

  if (normalized.includes("member_family_links_pair")) {
    return "Those members are already connected.";
  }

  if (normalized.includes("member_family_links_not_self") || normalized.includes("not_self")) {
    return "A member cannot be connected to themselves.";
  }

  if (normalized.includes("already registered")) {
    return "You are already registered for this event.";
  }

  if (normalized.includes("event is full")) {
    return "This event is full.";
  }

  if (normalized.includes("no member record")) {
    return "Ask your campus office to link a membership record to your login.";
  }

  if (normalized.includes("registration is not required")) {
    return "This event does not take registrations.";
  }

  if (normalized.includes("already started")) {
    return "This event has already started.";
  }

  return "Unable to save your changes. Please try again.";
}
