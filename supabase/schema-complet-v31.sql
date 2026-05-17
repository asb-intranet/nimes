-- ASB INTRANET V31 — Alignement Chantiers sur Terrassement
-- À exécuter après schema-complet-v30.sql.
-- Ce script est volontairement idempotent : il peut être relancé sans casser la base.

alter table if exists public.project_invoices
  add column if not exists category text default 'matériaux',
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

alter table if exists public.project_revenues
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 10,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0,
  add column if not exists status text default 'facturé';

alter table if exists public.merchandise_returns
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

-- Rattrapage des anciennes lignes : l'ancien champ amount est repris comme montant HT.
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
