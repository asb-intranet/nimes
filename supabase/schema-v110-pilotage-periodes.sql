-- ASB Intranet V110 - Pilotage des ouvrages par périodes
-- À lancer dans Supabase SQL Editor avant déploiement si les tables n'existent pas.

create table if not exists public.pilotage_work_periods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.pilotage_work_projects(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'en_cours',
  employee_ids text,
  employee_names text,
  selected_item_ids text,
  notes text
);

create table if not exists public.pilotage_work_period_purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.pilotage_work_projects(id) on delete cascade,
  period_id uuid not null references public.pilotage_work_periods(id) on delete cascade,
  supplier text,
  designation text not null,
  amount_ht numeric not null default 0,
  purchase_date date,
  invoice_ref text,
  notes text
);

create index if not exists pilotage_work_periods_project_id_idx on public.pilotage_work_periods(project_id);
create index if not exists pilotage_work_periods_dates_idx on public.pilotage_work_periods(start_date, end_date);
create index if not exists pilotage_work_period_purchases_period_id_idx on public.pilotage_work_period_purchases(period_id);
create index if not exists pilotage_work_period_purchases_project_id_idx on public.pilotage_work_period_purchases(project_id);

alter table public.pilotage_work_periods enable row level security;
alter table public.pilotage_work_period_purchases enable row level security;

grant usage on schema public to authenticated;
grant all on table public.pilotage_work_periods to authenticated;
grant all on table public.pilotage_work_period_purchases to authenticated;

drop policy if exists "pilotage_work_periods_authenticated_all" on public.pilotage_work_periods;
drop policy if exists "pilotage_work_period_purchases_authenticated_all" on public.pilotage_work_period_purchases;

create policy "pilotage_work_periods_authenticated_all"
on public.pilotage_work_periods
for all
to authenticated
using (true)
with check (true);

create policy "pilotage_work_period_purchases_authenticated_all"
on public.pilotage_work_period_purchases
for all
to authenticated
using (true)
with check (true);
