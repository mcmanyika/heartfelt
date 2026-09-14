# Heartfelt International Ministries

Centralized multi-location church management platform.

Head Office manages every campus from one system. Each location keeps its own members, giving, events, and terminals, while leadership can view consolidated reports. Access is enforced by role and location — in the database first, then again on the server.

This repository is at **Phase 9**: foundation, authentication, the admin shell, location/member management, the personal member portal, staff giving, payment terminals, events and announcements, scoped reports, Super Admin audit review, and organization settings.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase PostgreSQL, Auth, Storage, and Row Level Security
- `@supabase/supabase-js` and `@supabase/ssr`
- Zod, React Hook Form, Recharts, Lucide React
- Hosting target: Vercel + Supabase

Do not use Firebase, Prisma, NextAuth, MongoDB, or custom password hashes. Authentication belongs to Supabase Auth (`auth.users`).

## Architecture

Every tenant-scoped row carries `organization_id`. Location-scoped rows also carry `location_id`. User-owned rows carry `user_id` or `profile_id`.

Heartfelt International Ministries is the first organization (`heartfelt-international-ministries`). The schema does not assume it will be the only organization.

Never trust `organization_id` or `location_id` from the browser. Database triggers overwrite organization IDs from the related location. RLS and server-side checks must still verify the caller.

### Database relationships

```
organizations
  └── locations
        ├── profiles.location_id
        ├── members
        ├── payment_terminals
        └── giving_transactions

organizations
  ├── profiles  (id = auth.users.id)
  ├── roles / user_roles
  ├── giving_categories
  ├── events / announcements  (location_id null = organization-wide)
  └── audit_logs

members.profile_id is nullable
  └── a member can exist before they receive a login
  └── contact columns (first_name, last_name, email, phone) are used until a profile is linked
  └── member_family_links connect two members in the same organization
```

Membership numbers are generated in the database as `HIM-{LOCATION_CODE}-{NNNNNN}` using a per-location counter (`membership_counters`) to avoid races.

### RLS strategy

RLS is enabled and forced on application tables.

Helper functions (SECURITY DEFINER, fixed `search_path`, `auth.uid()`):

- `current_profile_id()`
- `current_user_organization_id()`
- `current_member_id()`
- `current_user_location_id()`
- `has_role(role_name)`
- `is_super_admin()`
- `user_has_location_access(location_uuid)`
- `can_view_location_content(location_uuid)`
- `write_audit_log(...)`

Policy summary:

| Role | Scope |
| --- | --- |
| SUPER_ADMIN | All rows in their organization |
| LOCATION_ADMIN | Assigned location only |
| FINANCE | Giving, terminals, and limited member identity for the assigned location |
| MEMBER | Own profile, own member record, own giving, org-wide + own-location events/announcements |

Audit logs are append-only for application users. Membership counters have no authenticated policies; only the definer function writes them.

UI hiding is convenience, not authorization. Server helpers in `src/lib/auth/` repeat the same rules.

### Roles

Roles live in `roles` and `user_roles`, not as a single string on the user.

- `SUPER_ADMIN` — typically `location_id` null
- `LOCATION_ADMIN` / `FINANCE` — typically a populated `location_id`
- `MEMBER` — personal portal

A user may hold more than one role.

## Required environment variables

Copy `.env.example` to `.env.local` (never commit `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never import `src/lib/supabase/admin.ts` from a Client Component.

## Local setup

1. Install Node.js 20.9+ (22+ recommended).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) and Docker.
3. Install dependencies:

```bash
npm install
```

4. Start local Supabase and apply migrations + seed:

```bash
supabase start
cp .env.example .env.local
```

Fill `.env.local` with the URL and keys printed by `supabase start` (`anon` and `service_role`).

```bash
supabase db reset
```

5. Create demo Auth users and sample operational data:

```bash
npm run bootstrap:demo-users
```

Temporary development password: `ChangeMe123!`

**DEVELOPMENT ONLY — CHANGE PASSWORDS BEFORE PRODUCTION.**

| Email | Role | Location |
| --- | --- | --- |
| `admin@heartfelt.local` | SUPER_ADMIN | All locations |
| `harare.admin@heartfelt.local` | LOCATION_ADMIN | Harare Central |
| `finance.harare@heartfelt.local` | FINANCE | Harare Central |
| `member@heartfelt.local` | MEMBER | Harare Central |

6. Run the app:

```bash
npm run dev
```

Open `/login`. After a successful sign-in:

- SUPER_ADMIN, LOCATION_ADMIN, and FINANCE go to `/admin/dashboard`
- MEMBER goes to `/member/dashboard`

Members cannot open `/admin`. Staff without a MEMBER role cannot open `/member`. Middleware only keeps anonymous users out of those prefixes. Layouts and server helpers enforce the actual role and location checks.

Authorization helpers:

- `src/lib/auth/get-current-user.ts`
- `src/lib/auth/require-user.ts`
- `src/lib/auth/require-role.ts`
- `src/lib/auth/require-location-access.ts`

7. Quality checks:

```bash
npm run lint
npm run build
```

### Remote Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Put the project URL, anon key, and service-role key in `.env.local`.
3. Apply the schema. Either link and push:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

or paste `supabase/migrations/001_initial_schema.sql`, `002_member_transfer.sql`, `003_event_registration.sql`, `004_phase9_security.sql`, `005_member_family.sql`, and `006_member_family_visibility.sql` into the Supabase SQL editor and run them.
4. Run `supabase/seed.sql` in the SQL editor if seed was not applied.
5. Run `npm run bootstrap:demo-users`.

Until the migration is applied, Auth can still reject unknown emails, but the app cannot resolve profiles or roles.

## Seed strategy

`supabase/seed.sql` loads reference data only:

- Organization: Heartfelt International Ministries
- Locations: Harare Central (HRE), Bulawayo (BYO), Johannesburg (JHB), Nairobi (NBO), Dallas (DAL)
- Roles and giving categories
- Representative events and announcements (`created_by` is filled by the bootstrap script)

It does **not** insert `auth.users`. That is unsafe/unsupported as a general SQL seed.

`scripts/create-demo-users.ts` uses the service-role Admin API to create test users, assign roles, and load sample members, terminals, and transactions.

## Regenerating database types

After schema changes:

```bash
npm run types:generate
```

Equivalent commands:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```

Hand-written types in `src/types/database.types.ts` match `001_initial_schema.sql` until this command is run against a live database.

## Project structure

```
src/
  app/
    (auth)/              # Phase 2
    (admin)/             # Phase 3+
    (member)/            # Phase 5
    terminal/            # Phase 7
    layout.tsx
    page.tsx
  components/
  lib/
    supabase/
      client.ts          # Browser / Client Components (anon key)
      server.ts          # Server Components, actions, route handlers
      admin.ts           # Service-role, server-only
    auth/                # Phase 2
    permissions/
    services/            # Phase 4+
    validators/
    utils/
  types/
    database.types.ts
supabase/
  migrations/
    001_initial_schema.sql
    002_member_transfer.sql
    003_event_registration.sql
    004_phase9_security.sql
    005_member_family.sql
    006_member_family_visibility.sql
  seed.sql
scripts/
  create-demo-users.ts
```

## Phase status

- [x] Phase 1 — Foundation, schema, RLS, clients, seed, bootstrap
- [x] Phase 2 — Authentication and authorization
- [x] Phase 3 — Admin shell
- [x] Phase 4 — Locations and members
- [x] Phase 5 — Member portal
- [x] Phase 6 — Giving
- [x] Phase 7 — Payment terminals
- [x] Phase 8 — Events and announcements
- [x] Phase 9 — Reports, audit, polish
