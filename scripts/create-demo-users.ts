/**
 * DEVELOPMENT ONLY bootstrap.
 *
 * Creates demo Auth users via the Supabase Admin API and loads sample
 * operational data that cannot safely be inserted into auth.users from SQL.
 *
 * Usage:
 *   cp .env.example .env.local
 *   # fill in local or project keys
 *   npm run bootstrap:demo-users
 *
 * DEVELOPMENT ONLY — CHANGE PASSWORDS BEFORE PRODUCTION.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Database, Enums } from "../src/types/database.types";

config({ path: ".env.local" });
config({ path: ".env" });

const DEMO_PASSWORD = "ChangeMe123!";
const ORG_SLUG = "heartfelt-international-ministries";

type AppRole = "SUPER_ADMIN" | "LOCATION_ADMIN" | "FINANCE" | "MEMBER";
type MembershipStatus = Enums<"membership_status">;
type PaymentMethod = Enums<"payment_method">;
type TransactionStatus = Enums<"transaction_status">;
type TerminalStatus = Enums<"terminal_status">;

type DemoUserSpec = {
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  locationCode: string | null;
};

const DEMO_USERS: DemoUserSpec[] = [
  {
    email: "admin@heartfelt.local",
    firstName: "Grace",
    lastName: "Mukamuri",
    role: "SUPER_ADMIN",
    locationCode: null,
  },
  {
    email: "harare.admin@heartfelt.local",
    firstName: "Tawanda",
    lastName: "Ncube",
    role: "LOCATION_ADMIN",
    locationCode: "HRE",
  },
  {
    email: "finance.harare@heartfelt.local",
    firstName: "Rudo",
    lastName: "Dube",
    role: "FINANCE",
    locationCode: "HRE",
  },
  {
    email: "member@heartfelt.local",
    firstName: "Blessing",
    lastName: "Moyo",
    role: "MEMBER",
    locationCode: "HRE",
  },
];

const FIRST_NAMES = [
  "Tendai",
  "Chipo",
  "Farai",
  "Nyasha",
  "Kudzai",
  "Amina",
  "David",
  "Sarah",
  "Michael",
  "Thandi",
  "Joseph",
  "Lindiwe",
  "Peter",
  "Faith",
  "Samuel",
  "Wanjiku",
  "Daniel",
  "Nomsa",
  "Brian",
  "Chiedza",
];

const LAST_NAMES = [
  "Moyo",
  "Ncube",
  "Sibanda",
  "Dube",
  "Mwangi",
  "Ochieng",
  "Nkosi",
  "Johnson",
  "Williams",
  "van der Merwe",
  "Mutasa",
  "Kamau",
  "Banda",
  "Chirwa",
  "Phiri",
];

const MEMBER_STATUSES: MembershipStatus[] = [
  "VISITOR",
  "NEW_CONVERT",
  "ACTIVE_MEMBER",
  "ACTIVE_MEMBER",
  "ACTIVE_MEMBER",
  "INACTIVE_MEMBER",
];

const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "ECOCASH",
  "ONEMONEY",
  "CARD",
  "BANK_TRANSFER",
  "TERMINAL",
];

const CURRENCIES = ["USD", "ZiG", "ZAR"] as const;
const TX_STATUSES: TransactionStatus[] = ["SUCCESS", "SUCCESS", "SUCCESS", "PENDING", "FAILED"];

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill in Supabase keys.`);
  }
  return value;
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

async function findUserIdByEmail(
  supabase: ReturnType<typeof createClient<Database>>,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email === email)?.id ?? null;
}

async function upsertDemoUser(
  supabase: ReturnType<typeof createClient<Database>>,
  spec: DemoUserSpec,
  organizationId: string,
  locationId: string | null,
): Promise<string> {
  const existingId = await findUserIdByEmail(supabase, spec.email);
  if (existingId) {
    console.log(`User already exists: ${spec.email}`);
    return existingId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: spec.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: spec.firstName,
      last_name: spec.lastName,
      organization_id: organizationId,
      location_id: locationId,
    },
  });

  if (error || !data.user) {
    throw error ?? new Error(`Failed to create ${spec.email}`);
  }

  console.log(`Created user: ${spec.email}`);
  return data.user.id;
}

async function main() {
  console.log("");
  console.log("============================================================");
  console.log("DEVELOPMENT ONLY — CHANGE PASSWORDS BEFORE PRODUCTION.");
  console.log("============================================================");
  console.log("");

  const supabase = createClient<Database>(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", ORG_SLUG)
    .single();

  if (organizationError || !organization) {
    throw new Error(
      "Organization not found. Run `supabase db reset` or apply migrations and seed.sql first.",
    );
  }

  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id, code, name")
    .eq("organization_id", organization.id);

  if (locationsError || !locations?.length) {
    throw new Error("Locations not found. Apply supabase/seed.sql first.");
  }

  const { data: roles, error: rolesError } = await supabase.from("roles").select("id, name");
  if (rolesError || !roles?.length) {
    throw new Error("Roles not found. Apply supabase/seed.sql first.");
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("giving_categories")
    .select("id, name")
    .eq("organization_id", organization.id);

  if (categoriesError || !categories?.length) {
    throw new Error("Giving categories not found. Apply supabase/seed.sql first.");
  }

  const locationByCode = new Map(locations.map((location) => [location.code, location]));
  const roleByName = new Map(roles.map((role) => [role.name, role]));

  const createdUsers: { spec: DemoUserSpec; userId: string; locationId: string | null }[] = [];

  for (const spec of DEMO_USERS) {
    const location = spec.locationCode ? locationByCode.get(spec.locationCode) : null;
    if (spec.locationCode && !location) {
      throw new Error(`Location ${spec.locationCode} is missing from seed data.`);
    }

    const userId = await upsertDemoUser(
      supabase,
      spec,
      organization.id,
      location?.id ?? null,
    );

    const profileUpdate = await supabase
      .from("profiles")
      .update({
        first_name: spec.firstName,
        last_name: spec.lastName,
        organization_id: organization.id,
        location_id: location?.id ?? null,
        status: "ACTIVE",
      })
      .eq("id", userId);

    if (profileUpdate.error) {
      throw profileUpdate.error;
    }

    const role = roleByName.get(spec.role);
    if (!role) {
      throw new Error(`Role ${spec.role} is missing from seed data.`);
    }

    if (spec.role !== "MEMBER") {
      const memberRole = roleByName.get("MEMBER");
      if (memberRole) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role_id", memberRole.id);
      }
    }

    let assignmentQuery = supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role_id", role.id)
      .eq("organization_id", organization.id);

    assignmentQuery = location?.id
      ? assignmentQuery.eq("location_id", location.id)
      : assignmentQuery.is("location_id", null);

    const { data: existingAssignment, error: assignmentLookupError } =
      await assignmentQuery.maybeSingle();

    if (assignmentLookupError) {
      throw assignmentLookupError;
    }

    if (!existingAssignment) {
      const { error: assignmentError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role_id: role.id,
        organization_id: organization.id,
        location_id: location?.id ?? null,
      });

      if (assignmentError) {
        throw assignmentError;
      }
    }

    createdUsers.push({
      spec,
      userId,
      locationId: location?.id ?? null,
    });
  }

  const memberUser = createdUsers.find((user) => user.spec.role === "MEMBER");
  const adminUser = createdUsers.find((user) => user.spec.role === "SUPER_ADMIN");
  const harare = locationByCode.get("HRE");

  if (!memberUser || !adminUser || !harare) {
    throw new Error("Required demo user or Harare location is missing.");
  }

  const { data: existingLinkedMember } = await supabase
    .from("members")
    .select("id, membership_number")
    .eq("profile_id", memberUser.userId)
    .maybeSingle();

  let linkedMemberId = existingLinkedMember?.id ?? null;

  if (!linkedMemberId) {
    const { data: insertedMember, error: memberError } = await supabase
      .from("members")
      .insert({
        organization_id: organization.id,
        location_id: harare.id,
        profile_id: memberUser.userId,
        first_name: memberUser.spec.firstName,
        last_name: memberUser.spec.lastName,
        email: memberUser.spec.email,
        phone: "+263 77 100 0001",
        membership_status: "ACTIVE_MEMBER",
        date_joined: "2022-03-12",
      })
      .select("id, membership_number")
      .single();

    if (memberError || !insertedMember) {
      throw memberError ?? new Error("Failed to create the demo member record.");
    }

    linkedMemberId = insertedMember.id;
    console.log(`Linked ${memberUser.spec.email} to ${insertedMember.membership_number}`);
  }

  const { count: memberCount, error: memberCountError } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  if (memberCountError) {
    throw memberCountError;
  }

  if ((memberCount ?? 0) < 30) {
    const locationCycle = ["HRE", "HRE", "HRE", "BYO", "BYO", "JHB", "JHB", "NBO", "DAL"];
    const sampleMembers = Array.from({ length: 40 }, (_, index) => {
      const location = locationByCode.get(pick(locationCycle, index));
      if (!location) {
        throw new Error("Sample member location is missing.");
      }

      const firstName = pick(FIRST_NAMES, index);
      const lastName = pick(LAST_NAMES, index + 3);

      return {
        organization_id: organization.id,
        location_id: location.id,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase().replace(/\s+/g, ".")}.${lastName
          .toLowerCase()
          .replace(/\s+/g, ".")}.${index + 1}@example.invalid`,
        phone: `+263 77 ${String(200000 + index).padStart(6, "0")}`,
        membership_status: pick(MEMBER_STATUSES, index),
        date_joined: daysAgo(20 + index * 7).slice(0, 10),
        gender: index % 2 === 0 ? "female" : "male",
        address: `${100 + index} Sample Street`,
      };
    });

    const { error: sampleMembersError } = await supabase.from("members").insert(sampleMembers);
    if (sampleMembersError) {
      throw sampleMembersError;
    }

    console.log(`Inserted ${sampleMembers.length} sample members.`);
  } else {
    console.log("Sample members already exist; skipping member seed.");
  }

  const terminalSpecs: {
    code: string;
    locationCode: string;
    deviceName: string;
    status: TerminalStatus;
  }[] = [
    { code: "HIM-HRE-T001", locationCode: "HRE", deviceName: "Harare Lobby 1", status: "ONLINE" },
    { code: "HIM-HRE-T002", locationCode: "HRE", deviceName: "Harare Lobby 2", status: "OFFLINE" },
    { code: "HIM-BYO-T001", locationCode: "BYO", deviceName: "Bulawayo Foyer", status: "ONLINE" },
    { code: "HIM-JHB-T001", locationCode: "JHB", deviceName: "Johannesburg Hall", status: "MAINTENANCE" },
    { code: "HIM-DAL-T001", locationCode: "DAL", deviceName: "Dallas Welcome Desk", status: "ONLINE" },
  ];

  for (const spec of terminalSpecs) {
    const location = locationByCode.get(spec.locationCode);
    if (!location) {
      throw new Error(`Terminal location ${spec.locationCode} is missing.`);
    }

    const { data: existingTerminal } = await supabase
      .from("payment_terminals")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("terminal_code", spec.code)
      .maybeSingle();

    if (!existingTerminal) {
      const { error } = await supabase.from("payment_terminals").insert({
        organization_id: organization.id,
        location_id: location.id,
        terminal_code: spec.code,
        device_name: spec.deviceName,
        serial_number: `SN-${spec.code}`,
        status: spec.status,
        last_seen_at: spec.status === "ONLINE" ? new Date().toISOString() : null,
        software_version: "0.1.0-mvp",
      });

      if (error) {
        throw error;
      }
    }
  }

  console.log("Ensured 5 payment terminals.");

  const { count: transactionCount, error: transactionCountError } = await supabase
    .from("giving_transactions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  if (transactionCountError) {
    throw transactionCountError;
  }

  if ((transactionCount ?? 0) < 100) {
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, location_id")
      .eq("organization_id", organization.id)
      .limit(50);

    if (membersError || !members?.length) {
      throw membersError ?? new Error("No members available for transaction seed.");
    }

    const { data: terminals, error: terminalsError } = await supabase
      .from("payment_terminals")
      .select("id, location_id")
      .eq("organization_id", organization.id);

    if (terminalsError) {
      throw terminalsError;
    }

    const transactions = Array.from({ length: 100 }, (_, index) => {
      const isAnonymous = index % 7 === 0;
      const member = pick(members, index);
      const locationId = isAnonymous
        ? pick(locations, index).id
        : member.location_id;
      const method = pick(PAYMENT_METHODS, index);
      const terminal = (terminals ?? []).find((item) => item.location_id === locationId);

      return {
        organization_id: organization.id,
        location_id: locationId,
        member_id: isAnonymous ? null : member.id,
        giving_category_id: pick(categories, index).id,
        amount: Number((15 + (index % 20) * 5 + (index % 3)).toFixed(2)),
        currency: pick(CURRENCIES, index),
        payment_method: method,
        transaction_reference: `HIM-SEED-${String(index + 1).padStart(6, "0")}`,
        status: pick(TX_STATUSES, index),
        terminal_id: method === "TERMINAL" || method === "CARD" ? terminal?.id ?? null : null,
        notes: isAnonymous ? "Anonymous giving" : null,
        created_by: adminUser.userId,
        created_at: daysAgo(index % 45),
      };
    });

    const { error: transactionsError } = await supabase.from("giving_transactions").insert(transactions);
    if (transactionsError) {
      throw transactionsError;
    }

    console.log("Inserted 100 sample giving transactions.");
  } else {
    console.log("Sample transactions already exist; skipping transaction seed.");
  }

  await supabase
    .from("events")
    .update({ created_by: adminUser.userId })
    .eq("organization_id", organization.id)
    .is("created_by", null);

  await supabase
    .from("announcements")
    .update({ created_by: adminUser.userId })
    .eq("organization_id", organization.id)
    .is("created_by", null);

  const { error: auditError } = await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    user_id: adminUser.userId,
    action: "USER_CREATED",
    entity_type: "bootstrap",
    metadata: {
      source: "scripts/create-demo-users.ts",
      users: DEMO_USERS.map((user) => user.email),
    },
  });

  if (auditError && !auditError.message.toLowerCase().includes("duplicate")) {
    console.warn("Audit log insert skipped:", auditError.message);
  }

  console.log("");
  console.log(`Organization: ${organization.name}`);
  console.log("Demo users (password: ChangeMe123!):");
  for (const user of createdUsers) {
    const locationLabel = user.spec.locationCode ?? "all locations";
    console.log(`  ${user.spec.email.padEnd(34)} ${user.spec.role.padEnd(16)} ${locationLabel}`);
  }
  console.log("");
  console.log("DEVELOPMENT ONLY — CHANGE PASSWORDS BEFORE PRODUCTION.");
  console.log("");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown bootstrap error";
  console.error("Demo user bootstrap failed:", message);
  process.exit(1);
});
