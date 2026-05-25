-- V85 - Correctif permissions calculs de rentabilité
-- Corrige : permission denied for table quote_calculations
-- À lancer dans Supabase > SQL Editor.

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

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.quote_calculations to anon, authenticated;

do $$
begin
  drop policy if exists quote_calculations_authenticated_all on public.quote_calculations;
  drop policy if exists quote_calculations_anon_all on public.quote_calculations;
  drop policy if exists quote_calculations_app_all on public.quote_calculations;

  create policy quote_calculations_app_all
  on public.quote_calculations
  for all
  to anon, authenticated
  using (true)
  with check (true);
end $$;

create index if not exists quote_calculations_updated_at_idx
on public.quote_calculations(updated_at desc);

-- Vérification rapide : cette requête doit retourner au moins la policy quote_calculations_app_all.
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'quote_calculations';
