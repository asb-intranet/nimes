-- Correctif V90 Module Client / Cahiers des charges ASB
-- À lancer dans Supabase SQL Editor.

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
drop policy if exists "client_specs_authenticated_all" on public.client_specs;
drop policy if exists "client_spec_items_authenticated_all" on public.client_spec_items;

-- Version simple compatible intranet : tous les utilisateurs connectés peuvent gérer les cahiers des charges.
-- L'accès au bouton/module reste géré côté interface par les rôles admin/salarié.
create policy "client_specs_authenticated_all"
on public.client_specs
for all
to authenticated
using (true)
with check (true);

create policy "client_spec_items_authenticated_all"
on public.client_spec_items
for all
to authenticated
using (true)
with check (true);

create index if not exists client_spec_items_spec_id_idx on public.client_spec_items(spec_id);
create index if not exists client_specs_project_id_idx on public.client_specs(project_id);
