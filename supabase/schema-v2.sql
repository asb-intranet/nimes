-- ASB INTRANET V2 - SCHEMA COMPLET

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  address text,
  description text,
  status text default 'en_cours',
  color text default '#0f172a',
  created_at timestamptz default now()
);

create table if not exists chantier_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  phase text default 'chantier',
  note text,
  file_url text not null,
  created_at timestamptz default now()
);

create table if not exists chantier_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  type text default 'autre',
  file_url text not null,
  created_at timestamptz default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  firstname text not null,
  lastname text not null,
  position text,
  role text default 'terrain',
  phone text,
  email text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists employee_projects (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists chantier_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  employee_id uuid references employees(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plate text,
  driver text,
  km int default 0,
  status text default 'ras',
  next_service date,
  insurance_date date,
  technical_control_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists internal_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  type text default 'achat',
  requester text,
  message text not null,
  priority text default 'normale',
  status text default 'nouvelle',
  created_at timestamptz default now()
);

insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('documents', 'documents', true) on conflict (id) do update set public = true;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;

alter table public.projects enable row level security;
alter table public.chantier_photos enable row level security;
alter table public.chantier_documents enable row level security;
alter table public.employees enable row level security;
alter table public.employee_projects enable row level security;
alter table public.chantier_notes enable row level security;
alter table public.vehicles enable row level security;
alter table public.internal_requests enable row level security;

drop policy if exists "projects open" on public.projects;
drop policy if exists "photos open" on public.chantier_photos;
drop policy if exists "documents open" on public.chantier_documents;
drop policy if exists "employees open" on public.employees;
drop policy if exists "employee_projects open" on public.employee_projects;
drop policy if exists "notes open" on public.chantier_notes;
drop policy if exists "vehicles open" on public.vehicles;
drop policy if exists "requests open" on public.internal_requests;

create policy "projects open" on public.projects for all to anon, authenticated using (true) with check (true);
create policy "photos open" on public.chantier_photos for all to anon, authenticated using (true) with check (true);
create policy "documents open" on public.chantier_documents for all to anon, authenticated using (true) with check (true);
create policy "employees open" on public.employees for all to anon, authenticated using (true) with check (true);
create policy "employee_projects open" on public.employee_projects for all to anon, authenticated using (true) with check (true);
create policy "notes open" on public.chantier_notes for all to anon, authenticated using (true) with check (true);
create policy "vehicles open" on public.vehicles for all to anon, authenticated using (true) with check (true);
create policy "requests open" on public.internal_requests for all to anon, authenticated using (true) with check (true);

drop policy if exists "photos storage insert" on storage.objects;
drop policy if exists "photos storage select" on storage.objects;
drop policy if exists "documents storage insert" on storage.objects;
drop policy if exists "documents storage select" on storage.objects;

create policy "photos storage insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'photos');
create policy "photos storage select" on storage.objects for select to anon, authenticated using (bucket_id = 'photos');
create policy "documents storage insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'documents');
create policy "documents storage select" on storage.objects for select to anon, authenticated using (bucket_id = 'documents');


-- PATCH V2.1 : corrige les colonnes manquantes si une ancienne base existe déjà
alter table public.projects add column if not exists color text default '#0f172a';
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists client text;
alter table public.projects add column if not exists address text;
alter table public.projects add column if not exists status text default 'en_cours';

-- Autorise suppression photos
grant all on public.chantier_photos to anon, authenticated;

drop policy if exists "photos storage delete" on storage.objects;
create policy "photos storage delete"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'photos');
