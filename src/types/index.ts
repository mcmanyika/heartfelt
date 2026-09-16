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
export type CellGroup = Tables<"cell_groups">;
export type CellGroupMember = Tables<"cell_group_members">;
export type CellGroupMeeting = Tables<"cell_group_meetings">;
export type CellGroupAttendance = Tables<"cell_group_attendance">;
export type Department = Tables<"departments">;
export type DepartmentMember = Tables<"department_members">;
export type Announcement = Tables<"announcements">;
export type AuditLog = Tables<"audit_logs">;

export type LocationStatus = Enums<"location_status">;
export type CellGroupStatus = Enums<"cell_group_status">;
export type CellGroupMemberRole = Enums<"cell_group_member_role">;
export type CellGroupAttendanceStatus = Enums<"cell_group_attendance_status">;
export type DepartmentStatus = Enums<"department_status">;
export type DepartmentMemberRole = Enums<"department_member_role">;
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
