-- ASB INTRANET V30 — Migration TVA / Gestion chantier + Terrassement
-- À exécuter après schema-complet-v29.sql dans Supabase SQL Editor.

alter table if exists public.project_invoices
  add column if not exists category text default 'matériaux',
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

alter table if exists public.project_revenues
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 10,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0,
  add column if not exists status text default 'facturé';

alter table if exists public.merchandise_returns
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

alter table if exists public.earthwork_invoices
  add column if not exists category text default 'matériaux',
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

create table if not exists public.earthwork_revenues (
  id uuid primary key default gen_random_uuid(),
  earthwork_id uuid references public.earthworks(id) on delete cascade,
  label text default 'Facturation client',
  amount numeric default 0,
  amount_ht numeric default 0,
  tva_rate numeric default 10,
  amount_tva numeric default 0,
  amount_ttc numeric default 0,
  billing_date date,
  status text default 'facturé',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.earthwork_returns (
  id uuid primary key default gen_random_uuid(),
  earthwork_id uuid references public.earthworks(id) on delete cascade,
  supplier text,
  amount numeric default 0,
  amount_ht numeric default 0,
  tva_rate numeric default 20,
  amount_tva numeric default 0,
  amount_ttc numeric default 0,
  return_date date,
  notes text,
  created_at timestamptz default now()
);

alter table if exists public.earthwork_revenues enable row level security;
alter table if exists public.earthwork_returns enable row level security;

do $$ begin
  create policy "earthwork_revenues_authenticated" on public.earthwork_revenues for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "earthwork_returns_authenticated" on public.earthwork_returns for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Rattrapage des anciennes lignes : l'ancien champ amount est repris comme montant HT.
update public.project_invoices set amount_ht = coalesce(nullif(amount_ht,0), amount, 0), amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,20) / 100), amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,20) / 100)) where amount is not null;
update public.project_revenues set amount_ht = coalesce(nullif(amount_ht,0), amount, 0), amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,10) / 100), amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,10) / 100)) where amount is not null;
update public.merchandise_returns set amount_ht = coalesce(nullif(amount_ht,0), amount, 0), amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,20) / 100), amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,20) / 100)) where amount is not null;
update public.earthwork_invoices set amount_ht = coalesce(nullif(amount_ht,0), amount, 0), amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,20) / 100), amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,20) / 100)) where amount is not null;
