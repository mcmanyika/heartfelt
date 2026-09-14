import type { Enums, Tables } from "@/types/database.types";

export type AppRole = "SUPER_ADMIN" | "LOCATION_ADMIN" | "FINANCE" | "MEMBER";

export type Organization = Tables<"organizations">;
export type Location = Tables<"locations">;
export type Profile = Tables<"profiles">;
export type Role = Tables<"roles">;
export type UserRole = Tables<"user_roles">;
export type Member = Tables<"members">;
export type MemberFamilyLink = Tables<"member_family_links">;
export type GivingCategory = Tables<"giving_categories">;
export type GivingTransaction = Tables<"giving_transactions">;
export type PaymentTerminal = Tables<"payment_terminals">;
export type Event = Tables<"events">;
export type EventRegistration = Tables<"event_registrations">;
export type Announcement = Tables<"announcements">;
export type AuditLog = Tables<"audit_logs">;

export type LocationStatus = Enums<"location_status">;
export type ProfileStatus = Enums<"profile_status">;
export type MembershipStatus = Enums<"membership_status">;
export type PaymentMethod = Enums<"payment_method">;
export type TransactionStatus = Enums<"transaction_status">;
export type TerminalStatus = Enums<"terminal_status">;
export type EventRegistrationStatus = Enums<"event_registration_status">;
export type FamilyRelationship = Enums<"family_relationship">;

export const APP_ROLES: readonly AppRole[] = [
  "SUPER_ADMIN",
  "LOCATION_ADMIN",
  "FINANCE",
  "MEMBER",
] as const;

export const PROFILE_STATUSES: readonly ProfileStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
] as const;

export const LOCATION_STATUSES: readonly LocationStatus[] = ["ACTIVE", "INACTIVE"] as const;

export const MVP_CURRENCIES = ["USD", "ZiG", "ZAR"] as const;
export type MvpCurrency = (typeof MVP_CURRENCIES)[number];
