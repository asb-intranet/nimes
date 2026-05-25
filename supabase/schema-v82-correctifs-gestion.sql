-- V82 - Correctifs gestion ASB
-- À lancer une fois dans Supabase > SQL Editor avant/après le déploiement V82.

-- 1) Calculs de rentabilité : sauvegarde centralisée unique Supabase
create table if not exists public.quote_calculations (
  id text primary key,
  saved_at timestamptz default now(),
  updated_at timestamptz default now(),
  form jsonb not null default '{}'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  labor jsonb not null default '[]'::jsonb,
  totals jsonb not null default '{}'::jsonb
);

alter table public.quote_calculations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quote_calculations'
      and policyname = 'quote_calculations_authenticated_all'
  ) then
    create policy quote_calculations_authenticated_all
    on public.quote_calculations
    for all
    to authenticated
    using (true)
    with check (true);
  end if;
end $$;

create index if not exists quote_calculations_updated_at_idx on public.quote_calculations(updated_at desc);

-- 2) Factures d'achats : colonnes utilisées par la modification depuis Gestion
alter table public.invoices add column if not exists invoice_number text default '';
alter table public.invoices add column if not exists label text default '';
alter table public.invoices add column if not exists category text default 'matériaux';
alter table public.invoices add column if not exists amount_ht numeric default 0;
alter table public.invoices add column if not exists tva_rate numeric default 20;
alter table public.invoices add column if not exists amount_tva numeric default 0;
alter table public.invoices add column if not exists amount_ttc numeric default 0;
alter table public.invoices add column if not exists invoice_date date;
alter table public.invoices add column if not exists notes text default '';

-- 3) Salariés/planning : archivage + gel des coûts, sans supprimer l'historique
alter table public.employees add column if not exists active boolean default true;
alter table public.employees add column if not exists archived boolean default false;
alter table public.employees add column if not exists archived_at timestamptz;
alter table public.planning add column if not exists employee_name_snapshot text;
alter table public.planning add column if not exists employee_daily_cost_snapshot numeric;

update public.planning p
set employee_name_snapshot = trim(coalesce(e.firstname,'') || ' ' || coalesce(e.lastname,''))
from public.employees e
where p.employee_id = e.id
  and (p.employee_name_snapshot is null or trim(p.employee_name_snapshot) = '');

update public.planning p
set employee_daily_cost_snapshot = coalesce(e.daily_cost, 0)
from public.employees e
where p.employee_id = e.id
  and (p.employee_daily_cost_snapshot is null or p.employee_daily_cost_snapshot = 0);
