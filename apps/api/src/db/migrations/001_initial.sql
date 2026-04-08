create extension if not exists "uuid-ossp";

create table admin_config (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null default '',
  company_logo_url text,
  address text,
  phone text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  default_timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);

create table google_integration (
  id uuid primary key default uuid_generate_v4(),
  access_token text not null,
  refresh_token text not null,
  calendar_id text not null,
  calendar_name text not null default '',
  connected_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table event_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  duration_minutes integer not null default 30,
  buffer_minutes integer not null default 0,
  partner_name text,
  partner_logo_url text,
  date_start date,
  date_end date,
  max_future_days integer,
  timezone text not null default 'America/Sao_Paulo',
  available_weekdays integer[] not null default '{1,2,3,4,5}',
  time_windows jsonb not null default '[{"start":"09:00","end":"18:00"}]',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table form_fields (
  id uuid primary key default uuid_generate_v4(),
  event_type_id uuid not null references event_types(id) on delete cascade,
  label text not null,
  placeholder text,
  field_type text not null check (field_type in ('text','email','tel','select','textarea','file')),
  options jsonb,
  is_required boolean not null default true,
  display_order integer not null default 0
);

create table bookings (
  id uuid primary key default uuid_generate_v4(),
  event_type_id uuid not null references event_types(id),
  google_event_id text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed')),
  form_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index bookings_start_at_idx on bookings(start_at);
create index bookings_event_type_id_idx on bookings(event_type_id);
create index form_fields_event_type_id_idx on form_fields(event_type_id);

-- Seed initial admin_config row (single-row table)
insert into admin_config (company_name) values ('Minha Empresa');

-- RLS: service role key bypasses RLS, so these policies just document intent
alter table admin_config enable row level security;
alter table google_integration enable row level security;
alter table event_types enable row level security;
alter table form_fields enable row level security;
alter table bookings enable row level security;

create policy "service_role_access" on admin_config for all using (true);
create policy "service_role_access" on google_integration for all using (true);
create policy "service_role_access" on event_types for all using (true);
create policy "service_role_access" on form_fields for all using (true);
create policy "service_role_access" on bookings for all using (true);
