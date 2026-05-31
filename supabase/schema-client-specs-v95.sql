-- ASB Intranet V95 - Planning de règlement contractuel
-- À lancer après les scripts V94 si besoin. Ce script est volontairement safe.

create table if not exists public.client_payment_schedules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  client_name text,
  project_id uuid null,
  address text,
  amount_ttc numeric default 0,
  status text default 'brouillon',
  notes text
);

create table if not exists public.client_payment_schedule_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  schedule_id uuid not null references public.client_payment_schedules(id) on delete cascade,
  position integer default 0,
  label text not null,
  percentage numeric default 0,
  amount_ttc numeric default 0,
  due_date date null,
  due_text text,
  status text default 'a_encaisser',
  notes text
);

alter table public.client_payment_schedules enable row level security;
alter table public.client_payment_schedule_items enable row level security;

grant usage on schema public to anon, authenticated;
grant all on table public.client_payment_schedules to authenticated;
grant all on table public.client_payment_schedule_items to authenticated;

drop policy if exists "client_payment_schedules_authenticated_all" on public.client_payment_schedules;
drop policy if exists "client_payment_schedule_items_authenticated_all" on public.client_payment_schedule_items;

create policy "client_payment_schedules_authenticated_all"
on public.client_payment_schedules
for all
to authenticated
using (true)
with check (true);

create policy "client_payment_schedule_items_authenticated_all"
on public.client_payment_schedule_items
for all
to authenticated
using (true)
with check (true);

create index if not exists client_payment_schedule_items_schedule_id_idx
on public.client_payment_schedule_items(schedule_id);
