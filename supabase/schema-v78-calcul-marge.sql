-- V78 - Calcul marge chantier/devis : sauvegarde centralisée multi-appareils
-- À exécuter une fois dans Supabase > SQL Editor, puis redéployer l'application.

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
    select 1 from pg_policies where schemaname = 'public' and tablename = 'quote_calculations' and policyname = 'quote_calculations_authenticated_all'
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
