-- Reference data for Heartfelt International Ministries.
-- Auth users are created separately via scripts/create-demo-users.ts
-- because inserting into auth.users from SQL is not a supported bootstrap path.

INSERT INTO public.organizations (name, slug, email, phone)
VALUES (
  'Heartfelt International Ministries',
  'heartfelt-international-ministries',
  'office@heartfelt.local',
  '+263 242 000 000'
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;

INSERT INTO public.roles (name, description)
VALUES
  ('SUPER_ADMIN', 'Organization-wide administration across all locations'),
  ('LOCATION_ADMIN', 'Administration for an assigned church location'),
  ('FINANCE', 'Giving and financial operations for an assigned location'),
  ('MEMBER', 'Personal member portal access')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.locations (
  organization_id,
  name,
  code,
  country,
  city,
  address,
  phone,
  email,
  status
)
SELECT
  o.id,
  v.name,
  v.code,
  v.country,
  v.city,
  v.address,
  v.phone,
  v.email,
  'ACTIVE'::public.location_status
FROM public.organizations o
CROSS JOIN (
  VALUES
    ('Harare Central', 'HRE', 'Zimbabwe', 'Harare', 'Harare CBD', '+263 242 111 111', 'harare@heartfelt.local'),
    ('Bulawayo', 'BYO', 'Zimbabwe', 'Bulawayo', 'Bulawayo City Centre', '+263 292 222 222', 'bulawayo@heartfelt.local'),
    ('Johannesburg', 'JHB', 'South Africa', 'Johannesburg', 'Sandton', '+27 11 333 3333', 'johannesburg@heartfelt.local'),
    ('Nairobi', 'NBO', 'Kenya', 'Nairobi', 'Westlands', '+254 20 444 4444', 'nairobi@heartfelt.local'),
    ('Dallas', 'DAL', 'United States', 'Dallas', 'Dallas, TX', '+1 214 555 5555', 'dallas@heartfelt.local')
) AS v(name, code, country, city, address, phone, email)
WHERE o.slug = 'heartfelt-international-ministries'
ON CONFLICT (organization_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  city = EXCLUDED.city,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO public.giving_categories (organization_id, name, description, active)
SELECT
  o.id,
  v.name,
  v.description,
  true
FROM public.organizations o
CROSS JOIN (
  VALUES
    ('Tithe', 'Regular tithe giving'),
    ('Offering', 'General offering'),
    ('Building Fund', 'Capital and building projects'),
    ('Missions', 'Local and international missions'),
    ('Other', 'Other designated giving')
) AS v(name, description)
WHERE o.slug = 'heartfelt-international-ministries'
ON CONFLICT (organization_id, name) DO UPDATE
SET
  description = EXCLUDED.description,
  active = true;

-- Representative events. created_by is null until demo users exist.
INSERT INTO public.events (
  organization_id,
  location_id,
  title,
  description,
  venue,
  start_date,
  end_date,
  registration_required,
  capacity
)
SELECT
  o.id,
  CASE WHEN v.code IS NULL THEN NULL ELSE l.id END,
  v.title,
  v.description,
  v.venue,
  now() + v.start_offset,
  now() + v.end_offset,
  v.registration_required,
  v.capacity
FROM public.organizations o
CROSS JOIN (
  VALUES
    (NULL::text, 'Annual Leaders Summit', 'Organization-wide leadership gathering.', 'Head Office', interval '21 days', interval '23 days', true, 200),
    ('HRE', 'Sunday Combined Service', 'Combined worship service for Harare Central.', 'Harare Central Auditorium', interval '7 days', interval '7 days 3 hours', false, NULL::integer),
    ('JHB', 'Youth Conference', 'Weekend conference for young adults.', 'Johannesburg Campus', interval '14 days', interval '16 days', true, 120),
    ('NBO', 'Prayer Night', 'Night of prayer and worship.', 'Nairobi Sanctuary', interval '10 days', interval '10 days 4 hours', false, NULL::integer),
    ('DAL', 'Diaspora Thanksgiving', 'Thanksgiving gathering for the Dallas congregation.', 'Dallas Campus', interval '30 days', interval '30 days 3 hours', true, 80)
) AS v(code, title, description, venue, start_offset, end_offset, registration_required, capacity)
LEFT JOIN public.locations l
  ON l.organization_id = o.id
 AND l.code = v.code
WHERE o.slug = 'heartfelt-international-ministries'
  AND NOT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.organization_id = o.id
      AND e.title = v.title
  );

INSERT INTO public.announcements (
  organization_id,
  location_id,
  title,
  message,
  publish_date,
  expiry_date
)
SELECT
  o.id,
  CASE WHEN v.code IS NULL THEN NULL ELSE l.id END,
  v.title,
  v.message,
  now() - interval '1 day',
  now() + interval '60 days'
FROM public.organizations o
CROSS JOIN (
  VALUES
    (NULL::text, 'Welcome to Heartfelt Connect', 'The centralized church platform is now available to every Heartfelt location.'),
    ('HRE', 'Midweek Bible Study', 'Join Harare Central for midweek Bible study every Wednesday at 6:00 PM.'),
    ('BYO', 'Building Project Update', 'The Bulawayo building fund remains open. Thank you for your continued giving.'),
    ('JHB', 'Volunteer Signup', 'Johannesburg needs ushers and hospitality volunteers for the next four Sundays.'),
    (NULL::text, 'Easter Services Schedule', 'Easter service times will be published by each location. Watch this space for updates.')
) AS v(code, title, message)
LEFT JOIN public.locations l
  ON l.organization_id = o.id
 AND l.code = v.code
WHERE o.slug = 'heartfelt-international-ministries'
  AND NOT EXISTS (
    SELECT 1
    FROM public.announcements a
    WHERE a.organization_id = o.id
      AND a.title = v.title
  );
