-- ASB Intranet V104 — Classement des ouvrages par chantier de pilotage
-- À lancer dans Supabase SQL Editor avant d'utiliser la V104.

create table if not exists public.pilotage_work_projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  client text,
  address text,
  reference text,
  status text default 'en_cours',
  notes text
);

-- Table des lignes d'ouvrage.
-- project_id est conservé pour compatibilité avec les versions précédentes,
-- mais il pointe maintenant vers les chantiers de pilotage créés dans le module.
create table if not exists public.chantier_work_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null,
  position integer default 0,
  numero text,
  designation text not null,
  category text,
  quantity numeric default 0,
  unit text,
  sold_ht numeric default 0,
  planned_hours numeric default 0,
  real_hours numeric default 0,
  labor_rate numeric default 45,
  employee_names text,
  merchandise_ht numeric default 0,
  subcontract_ht numeric default 0,
  other_costs_ht numeric default 0,
  progress numeric default 0,
  notes text
);

-- Si une ancienne version avait créé une contrainte vers public.projects,
-- on la supprime pour permettre les chantiers indépendants du module Pilotage.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.chantier_work_items'::regclass
      and contype = 'f'
  loop
    execute format('alter table public.chantier_work_items drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.pilotage_work_projects enable row level security;
alter table public.chantier_work_items enable row level security;

drop policy if exists "pilotage_work_projects_authenticated_all" on public.pilotage_work_projects;
create policy "pilotage_work_projects_authenticated_all"
on public.pilotage_work_projects
for all
to authenticated
using (true)
with check (true);

drop policy if exists "chantier_work_items_authenticated_all" on public.chantier_work_items;
create policy "chantier_work_items_authenticated_all"
on public.chantier_work_items
for all
to authenticated
using (true)
with check (true);

grant usage on schema public to authenticated;
grant all on table public.pilotage_work_projects to authenticated;
grant all on table public.chantier_work_items to authenticated;

create index if not exists pilotage_work_projects_created_at_idx on public.pilotage_work_projects(created_at);
create index if not exists chantier_work_items_project_id_idx on public.chantier_work_items(project_id);
create index if not exists chantier_work_items_position_idx on public.chantier_work_items(position);
