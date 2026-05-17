-- V38 - Gestion & pilotage global ASB
-- À lancer dans Supabase SQL Editor.

create table if not exists public.company_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  category text default 'Charges fixes',
  amount numeric(12,2) default 0,
  amount_ht numeric(12,2) default 0,
  tva_rate numeric(5,2) default 20,
  amount_tva numeric(12,2) default 0,
  amount_ttc numeric(12,2) default 0,
  frequency text default 'mensuelle',
  expense_date date default current_date,
  notes text,
  active boolean default true
);

alter table public.company_expenses add column if not exists amount numeric(12,2) default 0;
alter table public.company_expenses add column if not exists amount_ht numeric(12,2) default 0;
alter table public.company_expenses add column if not exists tva_rate numeric(5,2) default 20;
alter table public.company_expenses add column if not exists amount_tva numeric(12,2) default 0;
alter table public.company_expenses add column if not exists amount_ttc numeric(12,2) default 0;
alter table public.company_expenses add column if not exists frequency text default 'mensuelle';
alter table public.company_expenses add column if not exists expense_date date default current_date;
alter table public.company_expenses add column if not exists notes text;
alter table public.company_expenses add column if not exists active boolean default true;

alter table public.company_expenses enable row level security;

do $$ begin
  create policy "company_expenses_select" on public.company_expenses for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "company_expenses_insert" on public.company_expenses for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "company_expenses_update" on public.company_expenses for update using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "company_expenses_delete" on public.company_expenses for delete using (true);
exception when duplicate_object then null; end $$;

-- Sécurisation décimales TVA factures client / achats / retours si colonnes déjà présentes
alter table public.project_revenues add column if not exists amount_ht numeric(12,2) default 0;
alter table public.project_revenues add column if not exists tva_rate numeric(5,2) default 10;
alter table public.project_revenues add column if not exists amount_tva numeric(12,2) default 0;
alter table public.project_revenues add column if not exists amount_ttc numeric(12,2) default 0;

alter table public.project_invoices add column if not exists amount_ht numeric(12,2) default 0;
alter table public.project_invoices add column if not exists tva_rate numeric(5,2) default 20;
alter table public.project_invoices add column if not exists amount_tva numeric(12,2) default 0;
alter table public.project_invoices add column if not exists amount_ttc numeric(12,2) default 0;

alter table public.merchandise_returns add column if not exists amount_ht numeric(12,2) default 0;
alter table public.merchandise_returns add column if not exists tva_rate numeric(5,2) default 20;
alter table public.merchandise_returns add column if not exists amount_tva numeric(12,2) default 0;
alter table public.merchandise_returns add column if not exists amount_ttc numeric(12,2) default 0;
