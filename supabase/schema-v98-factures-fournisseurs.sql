-- ASB Intranet V98
-- Module Gestion > Factures fournisseurs indépendant

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  supplier text not null,
  invoice_number text,
  project_id uuid null,
  category text default 'matériaux',
  invoice_date date,
  due_date date,
  amount numeric default 0,
  amount_ht numeric default 0,
  tva_rate numeric default 20,
  amount_tva numeric default 0,
  amount_ttc numeric default 0,
  paid_ttc numeric default 0,
  status text default 'En attente',
  notes text
);

alter table public.supplier_invoices enable row level security;

drop policy if exists "supplier_invoices_authenticated_all" on public.supplier_invoices;
create policy "supplier_invoices_authenticated_all"
on public.supplier_invoices
for all
to authenticated
using (true)
with check (true);

grant all on table public.supplier_invoices to authenticated;
grant select on table public.supplier_invoices to anon;

create index if not exists supplier_invoices_invoice_date_idx on public.supplier_invoices(invoice_date);
create index if not exists supplier_invoices_supplier_idx on public.supplier_invoices(supplier);
create index if not exists supplier_invoices_project_id_idx on public.supplier_invoices(project_id);
