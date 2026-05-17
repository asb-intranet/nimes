-- ASB INTRANET V3 COMPLET - SCHEMA SUPABASE
-- À lancer dans Supabase > SQL Editor

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

alter table public.projects add column if not exists client text;
alter table public.projects add column if not exists address text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists status text default 'en_cours';
alter table public.projects add column if not exists color text default '#0f172a';

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

alter table public.vehicles add column if not exists plate text;
alter table public.vehicles add column if not exists driver text;
alter table public.vehicles add column if not exists km int default 0;
alter table public.vehicles add column if not exists status text default 'ras';
alter table public.vehicles add column if not exists next_service date;
alter table public.vehicles add column if not exists insurance_date date;
alter table public.vehicles add column if not exists technical_control_date date;
alter table public.vehicles add column if not exists notes text;

create table if not exists internal_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  type text default 'achat',
  requester text,
  message text not null,
  priority text default 'normale',
  status text default 'nouvelle',
  created_at timestamptz default now()
);

create table if not exists employee_planning (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  color text default '#0f172a',
  notes text,
  created_at timestamptz default now()
);

alter table public.employee_planning add column if not exists color text default '#0f172a';
alter table public.employee_planning add column if not exists start_time time;
alter table public.employee_planning add column if not exists end_time time;
alter table public.employee_planning add column if not exists notes text;

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
alter table public.employee_planning enable row level security;

drop policy if exists "projects open" on public.projects;
drop policy if exists "photos open" on public.chantier_photos;
drop policy if exists "documents open" on public.chantier_documents;
drop policy if exists "employees open" on public.employees;
drop policy if exists "employee_projects open" on public.employee_projects;
drop policy if exists "notes open" on public.chantier_notes;
drop policy if exists "vehicles open" on public.vehicles;
drop policy if exists "requests open" on public.internal_requests;
drop policy if exists "employee_planning open" on public.employee_planning;

create policy "projects open" on public.projects for all to anon, authenticated using (true) with check (true);
create policy "photos open" on public.chantier_photos for all to anon, authenticated using (true) with check (true);
create policy "documents open" on public.chantier_documents for all to anon, authenticated using (true) with check (true);
create policy "employees open" on public.employees for all to anon, authenticated using (true) with check (true);
create policy "employee_projects open" on public.employee_projects for all to anon, authenticated using (true) with check (true);
create policy "notes open" on public.chantier_notes for all to anon, authenticated using (true) with check (true);
create policy "vehicles open" on public.vehicles for all to anon, authenticated using (true) with check (true);
create policy "requests open" on public.internal_requests for all to anon, authenticated using (true) with check (true);
create policy "employee_planning open" on public.employee_planning for all to anon, authenticated using (true) with check (true);

drop policy if exists "photos storage insert" on storage.objects;
drop policy if exists "photos storage select" on storage.objects;
drop policy if exists "photos storage delete" on storage.objects;
drop policy if exists "documents storage insert" on storage.objects;
drop policy if exists "documents storage select" on storage.objects;
drop policy if exists "documents storage delete" on storage.objects;

create policy "photos storage insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'photos');
create policy "photos storage select" on storage.objects for select to anon, authenticated using (bucket_id = 'photos');
create policy "photos storage delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'photos');

create policy "documents storage insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'documents');
create policy "documents storage select" on storage.objects for select to anon, authenticated using (bucket_id = 'documents');
create policy "documents storage delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'documents');


-- V4 : zones chantier mises en avant
create table if not exists project_materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists project_vigilance (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

grant all on public.project_materials to anon, authenticated;
grant all on public.project_vigilance to anon, authenticated;

alter table public.project_materials enable row level security;
alter table public.project_vigilance enable row level security;

drop policy if exists "project_materials open" on public.project_materials;
drop policy if exists "project_vigilance open" on public.project_vigilance;

create policy "project_materials open" on public.project_materials for all to anon, authenticated using (true) with check (true);
create policy "project_vigilance open" on public.project_vigilance for all to anon, authenticated using (true) with check (true);


-- V5 : fiches structurées matériel / vigilance
alter table public.project_materials add column if not exists title text;
alter table public.project_materials add column if not exists content text;

alter table public.project_vigilance add column if not exists title text;
alter table public.project_vigilance add column if not exists content text;

update public.project_materials
set title = coalesce(title, content, 'Matériel à prévoir'),
    content = coalesce(content, '')
where title is null;

update public.project_vigilance
set title = coalesce(title, content, 'Point de vigilance'),
    content = coalesce(content, '')
where title is null;

grant all on public.project_materials to anon, authenticated;
grant all on public.project_vigilance to anon, authenticated;


-- V6 : module terrassement autonome
create table if not exists earthworks (id uuid primary key default gen_random_uuid(), name text not null, client text, address text, description text, status text default 'en_cours', color text default '#92400e', created_at timestamptz default now());
create table if not exists earthwork_photos (id uuid primary key default gen_random_uuid(), earthwork_id uuid references earthworks(id) on delete cascade, title text, file_url text not null, created_at timestamptz default now());
create table if not exists earthwork_documents (id uuid primary key default gen_random_uuid(), earthwork_id uuid references earthworks(id) on delete cascade, name text not null, type text default 'autre', file_url text not null, created_at timestamptz default now());
create table if not exists earthwork_notes (id uuid primary key default gen_random_uuid(), earthwork_id uuid references earthworks(id) on delete cascade, content text not null, created_at timestamptz default now());
create table if not exists earthwork_materials (id uuid primary key default gen_random_uuid(), earthwork_id uuid references earthworks(id) on delete cascade, title text, content text, created_at timestamptz default now());
create table if not exists earthwork_vigilance (id uuid primary key default gen_random_uuid(), earthwork_id uuid references earthworks(id) on delete cascade, title text, content text, created_at timestamptz default now());
create table if not exists earthwork_planning (id uuid primary key default gen_random_uuid(), earthwork_id uuid references earthworks(id) on delete cascade, title text not null, start_date date, end_date date, start_time time, end_time time, color text default '#92400e', notes text, created_at timestamptz default now());
grant all on public.earthworks to anon, authenticated; grant all on public.earthwork_photos to anon, authenticated; grant all on public.earthwork_documents to anon, authenticated; grant all on public.earthwork_notes to anon, authenticated; grant all on public.earthwork_materials to anon, authenticated; grant all on public.earthwork_vigilance to anon, authenticated; grant all on public.earthwork_planning to anon, authenticated;
alter table public.earthworks enable row level security; alter table public.earthwork_photos enable row level security; alter table public.earthwork_documents enable row level security; alter table public.earthwork_notes enable row level security; alter table public.earthwork_materials enable row level security; alter table public.earthwork_vigilance enable row level security; alter table public.earthwork_planning enable row level security;
drop policy if exists "earthworks open" on public.earthworks; drop policy if exists "earthwork_photos open" on public.earthwork_photos; drop policy if exists "earthwork_documents open" on public.earthwork_documents; drop policy if exists "earthwork_notes open" on public.earthwork_notes; drop policy if exists "earthwork_materials open" on public.earthwork_materials; drop policy if exists "earthwork_vigilance open" on public.earthwork_vigilance; drop policy if exists "earthwork_planning open" on public.earthwork_planning;
create policy "earthworks open" on public.earthworks for all to anon, authenticated using (true) with check (true); create policy "earthwork_photos open" on public.earthwork_photos for all to anon, authenticated using (true) with check (true); create policy "earthwork_documents open" on public.earthwork_documents for all to anon, authenticated using (true) with check (true); create policy "earthwork_notes open" on public.earthwork_notes for all to anon, authenticated using (true) with check (true); create policy "earthwork_materials open" on public.earthwork_materials for all to anon, authenticated using (true) with check (true); create policy "earthwork_vigilance open" on public.earthwork_vigilance for all to anon, authenticated using (true) with check (true); create policy "earthwork_planning open" on public.earthwork_planning for all to anon, authenticated using (true) with check (true);


-- V7 : fiche chantier épurée + avancement
alter table public.projects add column if not exists progress int default 0;


-- V8 : matériel prêt + factures chantier + galerie Photos Express
alter table public.project_materials add column if not exists ready boolean default false;
alter table public.projects add column if not exists progress int default 0;

create table if not exists project_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  supplier text not null,
  amount numeric default 0,
  invoice_date date,
  notes text,
  created_at timestamptz default now()
);

grant all on public.project_invoices to anon, authenticated;
alter table public.project_invoices enable row level security;
drop policy if exists "project_invoices open" on public.project_invoices;
create policy "project_invoices open" on public.project_invoices for all to anon, authenticated using (true) with check (true);


-- V9 : gestion rentabilité + coût journée salarié + tableau de bord matériel
alter table public.employees add column if not exists daily_cost numeric default 0;
alter table public.project_materials add column if not exists ready boolean default false;
alter table public.projects add column if not exists progress int default 0;

create table if not exists project_revenues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  label text default 'Facturation client',
  amount numeric default 0,
  billing_date date,
  notes text,
  created_at timestamptz default now()
);

grant all on public.project_revenues to anon, authenticated;
alter table public.project_revenues enable row level security;

drop policy if exists "project_revenues open" on public.project_revenues;
create policy "project_revenues open" on public.project_revenues for all to anon, authenticated using (true) with check (true);

alter table public.earthworks add column if not exists progress int default 0;
alter table public.earthwork_materials add column if not exists ready boolean default false;


-- V10 : magasinier + correction demandes internes
alter table public.project_materials add column if not exists ready boolean default false;
alter table public.project_materials add column if not exists title text;
alter table public.project_materials add column if not exists content text;

alter table public.internal_requests add column if not exists priority text default 'normale';
alter table public.internal_requests add column if not exists status text default 'nouvelle';
alter table public.internal_requests add column if not exists requester text;
alter table public.internal_requests add column if not exists type text default 'achat';
alter table public.internal_requests add column if not exists message text;

grant all on public.internal_requests to anon, authenticated;
drop policy if exists "requests open" on public.internal_requests;
create policy "requests open" on public.internal_requests for all to anon, authenticated using (true) with check (true);

alter table public.employees add column if not exists daily_cost numeric default 0;

create table if not exists project_revenues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  label text default 'Facturation client',
  amount numeric default 0,
  billing_date date,
  notes text,
  created_at timestamptz default now()
);

grant all on public.project_revenues to anon, authenticated;
alter table public.project_revenues enable row level security;
drop policy if exists "project_revenues open" on public.project_revenues;
create policy "project_revenues open" on public.project_revenues for all to anon, authenticated using (true) with check (true);

alter table public.earthworks add column if not exists progress int default 0;
alter table public.earthwork_materials add column if not exists ready boolean default false;


-- V13 : magasinier pièces jointes + retours marchandise + terrassement + gestion rapports
alter table public.project_materials add column if not exists attachment_url text;
alter table public.project_materials add column if not exists attachment_type text;
alter table public.project_materials add column if not exists ready boolean default false;

create table if not exists public.merchandise_returns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  supplier text,
  amount numeric default 0,
  return_date date,
  notes text,
  created_at timestamptz default now()
);

alter table public.merchandise_returns enable row level security;
grant all on public.merchandise_returns to anon, authenticated;
drop policy if exists "returns_open" on public.merchandise_returns;
create policy "returns_open" on public.merchandise_returns for all to anon, authenticated using (true) with check (true);

alter table public.earthworks add column if not exists linked_project uuid references projects(id) on delete set null;
alter table public.earthwork_planning alter column start_time drop not null;
alter table public.earthwork_planning alter column end_time drop not null;

alter table public.project_revenues add column if not exists label text default 'Facturation client';
alter table public.project_revenues add column if not exists notes text;

-- V14 : création matériel depuis module Magasinier
alter table public.project_materials add column if not exists priority text default 'normale';
alter table public.project_materials add column if not exists attachment_url text;
alter table public.project_materials add column if not exists attachment_type text;
alter table public.project_materials add column if not exists ready boolean default false;

-- V15 : accès visuel / accueil par tuiles, pas de nouvelle table.

-- V16 : pas de nouvelle table. Suppression Accueil + accès chantier direct.

-- V17 : pas de nouvelle table. Navigation sans scroll + fiche chantier pleine page.


-- V18 : correction terrassement linked_project + présentation type chantier
alter table public.earthworks add column if not exists linked_project uuid references projects(id) on delete set null;
alter table public.earthwork_planning alter column start_time drop not null;
alter table public.earthwork_planning alter column end_time drop not null;


-- V19 : terrassement lié à terrassement + location engin
alter table public.earthworks add column if not exists linked_project uuid references earthworks(id) on delete set null;

create table if not exists public.earthwork_machine_rentals (
  id uuid primary key default gen_random_uuid(),
  earthwork_id uuid references earthworks(id) on delete cascade,
  machine_type text,
  start_date date,
  end_date date,
  rental_price numeric default 0,
  notes text,
  created_at timestamptz default now()
);

alter table public.earthwork_machine_rentals enable row level security;
grant all on public.earthwork_machine_rentals to anon, authenticated;
drop policy if exists "earthwork_machine_rentals open" on public.earthwork_machine_rentals;
create policy "earthwork_machine_rentals open" on public.earthwork_machine_rentals for all to anon, authenticated using (true) with check (true);


-- V20 : Location engin terrassement propre
create table if not exists public.earthwork_machine_rentals (
  id uuid primary key default gen_random_uuid(),
  earthwork_id uuid references earthworks(id) on delete cascade,
  machine_type text,
  start_date date,
  end_date date,
  rental_price numeric default 0,
  notes text,
  created_at timestamptz default now()
);

alter table public.earthwork_machine_rentals enable row level security;
grant all on public.earthwork_machine_rentals to anon, authenticated;
drop policy if exists "earthwork_machine_rentals open" on public.earthwork_machine_rentals;
create policy "earthwork_machine_rentals open" on public.earthwork_machine_rentals for all to anon, authenticated using (true) with check (true);

alter table public.earthworks add column if not exists linked_project uuid references earthworks(id) on delete set null;

-- V24 - demandes internes : attribution et planification optionnelles
alter table public.internal_requests add column if not exists assigned_to uuid references public.employees(id) on delete set null;
alter table public.internal_requests add column if not exists planned_date date;

-- V29 - Terrassement factures / pièces jointes / facturation client
alter table public.earthworks add column if not exists client_billing numeric default 0;

alter table public.earthwork_materials add column if not exists attachment_url text;
alter table public.earthwork_materials add column if not exists attachment_type text;
alter table public.earthwork_vigilance add column if not exists attachment_url text;
alter table public.earthwork_vigilance add column if not exists attachment_type text;

create table if not exists public.earthwork_invoices (
  id uuid primary key default gen_random_uuid(),
  earthwork_id uuid references earthworks(id) on delete cascade,
  supplier text,
  amount numeric default 0,
  invoice_date date,
  notes text,
  created_at timestamptz default now()
);

alter table public.earthwork_invoices enable row level security;
grant all on public.earthwork_invoices to anon, authenticated;
drop policy if exists "earthwork_invoices open" on public.earthwork_invoices;
create policy "earthwork_invoices open" on public.earthwork_invoices for all to anon, authenticated using (true) with check (true);
