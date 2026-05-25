-- V83 - Correctif SQL safe ASB
-- Corrige l'erreur V82 : relation public.invoices inexistante.
-- À lancer dans Supabase > SQL Editor. Ce script ne bloque pas si certaines tables n'existent pas.

-- 1) Calculs de rentabilité : sauvegarde centralisée Supabase
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

-- 2) Factures d'achats chantier : vraie table utilisée par l'application = project_invoices
DO $$
BEGIN
  IF to_regclass('public.project_invoices') IS NOT NULL THEN
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS invoice_number text default '';
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS label text default '';
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS category text default 'matériaux';
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS amount_ht numeric default 0;
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS tva_rate numeric default 20;
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS amount_tva numeric default 0;
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS amount_ttc numeric default 0;
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS invoice_date date;
    ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS notes text default '';

    UPDATE public.project_invoices
    SET amount_ht = COALESCE(amount_ht, amount, 0)
    WHERE amount_ht IS NULL OR amount_ht = 0;

    UPDATE public.project_invoices
    SET amount_tva = ROUND((COALESCE(amount_ht, amount, 0) * COALESCE(tva_rate, 20) / 100)::numeric, 2)
    WHERE amount_tva IS NULL OR amount_tva = 0;

    UPDATE public.project_invoices
    SET amount_ttc = ROUND((COALESCE(amount_ht, amount, 0) + COALESCE(amount_tva, 0))::numeric, 2)
    WHERE amount_ttc IS NULL OR amount_ttc = 0;
  END IF;
END $$;

-- 3) Factures terrassement : vraie table utilisée par l'application = earthwork_invoices
DO $$
BEGIN
  IF to_regclass('public.earthwork_invoices') IS NOT NULL THEN
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS invoice_number text default '';
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS label text default '';
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS category text default 'matériaux';
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS amount_ht numeric default 0;
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS tva_rate numeric default 20;
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS amount_tva numeric default 0;
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS amount_ttc numeric default 0;
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS invoice_date date;
    ALTER TABLE public.earthwork_invoices ADD COLUMN IF NOT EXISTS notes text default '';

    UPDATE public.earthwork_invoices
    SET amount_ht = COALESCE(amount_ht, amount, 0)
    WHERE amount_ht IS NULL OR amount_ht = 0;

    UPDATE public.earthwork_invoices
    SET amount_tva = ROUND((COALESCE(amount_ht, amount, 0) * COALESCE(tva_rate, 20) / 100)::numeric, 2)
    WHERE amount_tva IS NULL OR amount_tva = 0;

    UPDATE public.earthwork_invoices
    SET amount_ttc = ROUND((COALESCE(amount_ht, amount, 0) + COALESCE(amount_tva, 0))::numeric, 2)
    WHERE amount_ttc IS NULL OR amount_ttc = 0;
  END IF;
END $$;

-- 4) Salariés/planning : archivage + gel des coûts, sans supprimer l'historique
DO $$
BEGIN
  IF to_regclass('public.employees') IS NOT NULL THEN
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS active boolean default true;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS archived boolean default false;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS archived_at timestamptz;
  END IF;

  IF to_regclass('public.planning') IS NOT NULL THEN
    ALTER TABLE public.planning ADD COLUMN IF NOT EXISTS employee_name_snapshot text;
    ALTER TABLE public.planning ADD COLUMN IF NOT EXISTS employee_daily_cost_snapshot numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.planning') IS NOT NULL AND to_regclass('public.employees') IS NOT NULL THEN
    UPDATE public.planning p
    SET employee_name_snapshot = trim(coalesce(e.firstname,'') || ' ' || coalesce(e.lastname,''))
    FROM public.employees e
    WHERE p.employee_id = e.id
      AND (p.employee_name_snapshot IS NULL OR trim(p.employee_name_snapshot) = '');

    UPDATE public.planning p
    SET employee_daily_cost_snapshot = coalesce(e.daily_cost, 0)
    FROM public.employees e
    WHERE p.employee_id = e.id
      AND (p.employee_daily_cost_snapshot IS NULL OR p.employee_daily_cost_snapshot = 0);
  END IF;
END $$;
