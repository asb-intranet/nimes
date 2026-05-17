-- V35 - TVA sur locations d'engins terrassement + décimales
-- À exécuter dans Supabase SQL Editor avant/après déploiement.

alter table if exists public.earthwork_machine_rentals
  add column if not exists amount numeric default 0,
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0;

update public.earthwork_machine_rentals
set amount = coalesce(nullif(amount,0), rental_price, 0),
    amount_ht = coalesce(nullif(amount_ht,0), rental_price, amount, 0),
    amount_tva = round((coalesce(nullif(amount_ht,0), rental_price, amount, 0) * coalesce(tva_rate,20) / 100)::numeric, 2),
    amount_ttc = round((coalesce(nullif(amount_ht,0), rental_price, amount, 0) + (coalesce(nullif(amount_ht,0), rental_price, amount, 0) * coalesce(tva_rate,20) / 100))::numeric, 2),
    rental_price = coalesce(nullif(amount_ht,0), rental_price, amount, 0)
where rental_price is not null or amount is not null;
