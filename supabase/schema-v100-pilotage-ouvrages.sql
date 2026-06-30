-- ASB Intranet V100 — Pilotage des ouvrages manuel

create table if not exists public.chantier_work_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
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

alter table public.chantier_work_items enable row level security;

drop policy if exists "chantier_work_items_authenticated_all" on public.chantier_work_items;
create policy "chantier_work_items_authenticated_all"
on public.chantier_work_items
for all
to authenticated
using (true)
with check (true);

grant usage on schema public to authenticated;
grant all on table public.chantier_work_items to authenticated;

create index if not exists chantier_work_items_project_id_idx on public.chantier_work_items(project_id);
create index if not exists chantier_work_items_position_idx on public.chantier_work_items(position);
