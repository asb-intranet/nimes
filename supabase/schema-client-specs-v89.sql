-- Module Client / Cahiers des charges ASB V89
-- À lancer dans Supabase SQL Editor avant utilisation du module.

create table if not exists public.client_specs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  client_name text,
  project_id uuid null,
  address text,
  notes text,
  status text default 'brouillon'
);

create table if not exists public.client_spec_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  spec_id uuid not null references public.client_specs(id) on delete cascade,
  position integer default 0,
  title text not null,
  supplier text,
  reference text,
  quantity numeric default 1,
  unit_price_ht numeric default 0,
  tva_rate numeric default 20,
  visual_url text,
  notes text
);

alter table public.client_specs enable row level security;
alter table public.client_spec_items enable row level security;

drop policy if exists "admin_all_client_specs" on public.client_specs;
drop policy if exists "admin_all_client_spec_items" on public.client_spec_items;

create policy "admin_all_client_specs"
on public.client_specs
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

create policy "admin_all_client_spec_items"
on public.client_spec_items
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

create index if not exists client_spec_items_spec_id_idx on public.client_spec_items(spec_id);
create index if not exists client_specs_project_id_idx on public.client_specs(project_id);
