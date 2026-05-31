-- ASB Intranet V93 - Module Clients / CDC Premium
-- À lancer dans Supabase SQL Editor avant d'utiliser le module.

create extension if not exists pgcrypto;

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



create table if not exists public.client_spec_payment_terms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  spec_id uuid not null references public.client_specs(id) on delete cascade,
  position integer default 0,
  label text not null default 'Échéance',
  percentage numeric default 0,
  amount_ttc numeric default 0,
  due_text text,
  notes text
);

alter table public.client_specs enable row level security;
alter table public.client_spec_items enable row level security;
alter table public.client_spec_payment_terms enable row level security;

grant usage on schema public to anon, authenticated;
grant all on table public.client_specs to authenticated;
grant all on table public.client_spec_items to authenticated;
grant all on table public.client_spec_payment_terms to authenticated;

drop policy if exists "client_specs_authenticated_all" on public.client_specs;
drop policy if exists "client_spec_items_authenticated_all" on public.client_spec_items;
drop policy if exists "client_spec_payment_terms_authenticated_all" on public.client_spec_payment_terms;
drop policy if exists "admin_all_client_specs" on public.client_specs;
drop policy if exists "admin_all_client_spec_items" on public.client_spec_items;

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

create policy "client_spec_payment_terms_authenticated_all"
on public.client_spec_payment_terms
for all
to authenticated
using (true)
with check (true);

create index if not exists client_spec_items_spec_id_idx on public.client_spec_items(spec_id);
create index if not exists client_spec_payment_terms_spec_id_idx on public.client_spec_payment_terms(spec_id);
create index if not exists client_specs_project_id_idx on public.client_specs(project_id);

-- Bucket Storage pour les visuels du module client.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-specs',
  'client-specs',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "client_specs_images_read" on storage.objects;
drop policy if exists "client_specs_images_insert" on storage.objects;
drop policy if exists "client_specs_images_update" on storage.objects;
drop policy if exists "client_specs_images_delete" on storage.objects;

create policy "client_specs_images_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'client-specs');

create policy "client_specs_images_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'client-specs');

create policy "client_specs_images_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'client-specs')
with check (bucket_id = 'client-specs');

create policy "client_specs_images_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'client-specs');
