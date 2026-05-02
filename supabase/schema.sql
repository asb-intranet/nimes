-- ASB INTRANET - SUPABASE SCHEMA
-- À exécuter dans Supabase > SQL Editor

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'lecture',
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  address text,
  status text default 'En cours',
  progress int default 0,
  manager text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists chantier_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  phase text,
  note text,
  file_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists chantier_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  type text,
  file_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  label text not null,
  amount numeric default 0,
  due_date date,
  status text default 'À venir',
  file_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists planning (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  start_date date,
  end_date date,
  team text,
  priority text default 'Normale',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  employee text not null,
  project_id uuid references projects(id) on delete set null,
  work_date date default current_date,
  start_time time,
  end_time time,
  pause_minutes int default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  driver text,
  km int default 0,
  status text default 'RAS',
  alert text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists internal_requests (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  project_id uuid references projects(id) on delete set null,
  requester text,
  message text,
  status text default 'Ouverte',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'lecture');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table profiles enable row level security;
alter table projects enable row level security;
alter table chantier_photos enable row level security;
alter table chantier_documents enable row level security;
alter table payments enable row level security;
alter table planning enable row level security;
alter table time_entries enable row level security;
alter table vehicles enable row level security;
alter table internal_requests enable row level security;

create policy "profiles select own" on profiles for select using (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id);

create policy "projects all authenticated" on projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "photos all authenticated" on chantier_photos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "documents all authenticated" on chantier_documents for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "payments all authenticated" on payments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "planning all authenticated" on planning for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "time all authenticated" on time_entries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "vehicles all authenticated" on vehicles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "requests all authenticated" on internal_requests for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', true) on conflict (id) do nothing;

create policy "photos storage authenticated insert" on storage.objects for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "photos storage public select" on storage.objects for select using (bucket_id = 'photos');
create policy "documents storage authenticated insert" on storage.objects for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');
create policy "documents storage public select" on storage.objects for select using (bucket_id = 'documents');
