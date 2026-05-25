-- V84 - Correctif SQL ultra-safe ASB
-- Corrige l'erreur V83 : la table public.planning / colonne planning.employee_id n'existe pas.
-- L'application utilise principalement public.employee_planning.
-- À lancer dans Supabase > SQL Editor.

-- 1) Sauvegarde centralisée des calculs de rentabilité
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

-- 2) Archivage salariés, sans suppression réelle de l'historique
DO $$
BEGIN
  IF to_regclass('public.employees') IS NOT NULL THEN
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS active boolean default true;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS archived boolean default false;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS archived_at timestamptz;
  END IF;
END $$;

-- 3) Gel historique sur la vraie table planning utilisée par l'app : employee_planning
DO $$
BEGIN
  IF to_regclass('public.employee_planning') IS NOT NULL THEN
    ALTER TABLE public.employee_planning ADD COLUMN IF NOT EXISTS employee_name_snapshot text;
    ALTER TABLE public.employee_planning ADD COLUMN IF NOT EXISTS employee_daily_cost_snapshot numeric;
  END IF;
END $$;

-- 4) Remplissage snapshots, uniquement si les colonnes nécessaires existent vraiment
DO $$
DECLARE
  has_employee_planning boolean := to_regclass('public.employee_planning') IS NOT NULL;
  has_employees boolean := to_regclass('public.employees') IS NOT NULL;
  ep_has_employee_id boolean;
  ep_has_name_snapshot boolean;
  ep_has_cost_snapshot boolean;
  e_has_firstname boolean;
  e_has_lastname boolean;
  e_has_daily_cost boolean;
  e_has_cost_per_day boolean;
BEGIN
  IF has_employee_planning AND has_employees THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employee_planning' AND column_name='employee_id') INTO ep_has_employee_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employee_planning' AND column_name='employee_name_snapshot') INTO ep_has_name_snapshot;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employee_planning' AND column_name='employee_daily_cost_snapshot') INTO ep_has_cost_snapshot;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='firstname') INTO e_has_firstname;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='lastname') INTO e_has_lastname;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='daily_cost') INTO e_has_daily_cost;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name='cost_per_day') INTO e_has_cost_per_day;

    IF ep_has_employee_id AND ep_has_name_snapshot AND e_has_firstname AND e_has_lastname THEN
      EXECUTE '
        UPDATE public.employee_planning ep
        SET employee_name_snapshot = trim(coalesce(e.firstname, '''') || '' '' || coalesce(e.lastname, ''''))
        FROM public.employees e
        WHERE ep.employee_id = e.id
          AND (ep.employee_name_snapshot IS NULL OR trim(ep.employee_name_snapshot) = '''')
      ';
    END IF;

    IF ep_has_employee_id AND ep_has_cost_snapshot AND e_has_daily_cost THEN
      EXECUTE '
        UPDATE public.employee_planning ep
        SET employee_daily_cost_snapshot = coalesce(e.daily_cost, 0)
        FROM public.employees e
        WHERE ep.employee_id = e.id
          AND (ep.employee_daily_cost_snapshot IS NULL OR ep.employee_daily_cost_snapshot = 0)
      ';
    ELSIF ep_has_employee_id AND ep_has_cost_snapshot AND e_has_cost_per_day THEN
      EXECUTE '
        UPDATE public.employee_planning ep
        SET employee_daily_cost_snapshot = coalesce(e.cost_per_day, 0)
        FROM public.employees e
        WHERE ep.employee_id = e.id
          AND (ep.employee_daily_cost_snapshot IS NULL OR ep.employee_daily_cost_snapshot = 0)
      ';
    END IF;
  END IF;
END $$;

-- 5) Compatibilité factures achats si les tables existent, sans bloquer si elles n'existent pas
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
  END IF;

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
  END IF;
END $$;
