-- V32 / V33 - TVA complète factures clients, achats et retours
-- À exécuter une seule fois dans Supabase SQL Editor avant ou après le déploiement.

alter table if exists public.project_invoices
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

alter table if exists public.project_revenues
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 10,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0,
  add column if not exists label text default 'Facturation client',
  add column if not exists notes text;

alter table if exists public.merchandise_returns
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

alter table if exists public.earthwork_invoices
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

alter table if exists public.earthwork_returns
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

-- Recalcule les anciennes lignes existantes.
update public.project_invoices
set amount_ht = coalesce(nullif(amount_ht,0), amount, 0),
    amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,20) / 100),
    amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,20) / 100))
where amount is not null;

update public.project_revenues
set amount_ht = coalesce(nullif(amount_ht,0), amount, 0),
    amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,10) / 100),
    amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,10) / 100))
where amount is not null;

update public.merchandise_returns
set amount_ht = coalesce(nullif(amount_ht,0), amount, 0),
    amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,20) / 100),
    amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,20) / 100))
where amount is not null;

update public.earthwork_invoices
set amount_ht = coalesce(nullif(amount_ht,0), amount, 0),
    amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,20) / 100),
    amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,20) / 100))
where amount is not null;

update public.earthwork_returns
set amount_ht = coalesce(nullif(amount_ht,0), amount, 0),
    amount_tva = coalesce(nullif(amount_tva,0), coalesce(amount,0) * coalesce(tva_rate,20) / 100),
    amount_ttc = coalesce(nullif(amount_ttc,0), coalesce(amount,0) + (coalesce(amount,0) * coalesce(tva_rate,20) / 100))
where amount is not null;
