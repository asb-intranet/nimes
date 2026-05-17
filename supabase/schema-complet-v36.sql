-- V36 - Rapports premium gestion / TVA détaillée / noms salariés
-- Migration additive et sécurisée : peut être exécutée plusieurs fois.
-- Objectif : garantir les colonnes nécessaires pour les rapports HT / TVA / TTC,
-- TVA collectée, TVA déductible, locations d'engins, retours et facturation client.

-- 1) Facturation client : HT / taux TVA / TVA collectée / TTC
alter table if exists public.client_invoices
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 10,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0,
  add column if not exists invoice_date date,
  add column if not exists label text,
  add column if not exists notes text;

update public.client_invoices
set amount_ht = round(coalesce(nullif(amount_ht,0), amount, amount_ttc / (1 + coalesce(tva_rate,10) / 100), 0)::numeric, 2),
    amount_tva = round((coalesce(nullif(amount_ht,0), amount, 0) * coalesce(tva_rate,10) / 100)::numeric, 2),
    amount_ttc = round((coalesce(nullif(amount_ht,0), amount, 0) + (coalesce(nullif(amount_ht,0), amount, 0) * coalesce(tva_rate,10) / 100))::numeric, 2)
where true;

-- 2) Factures achats fournisseurs : HT / taux TVA / TVA déductible / TTC
alter table if exists public.purchase_invoices
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0,
  add column if not exists invoice_date date,
  add column if not exists supplier text,
  add column if not exists notes text;

update public.purchase_invoices
set amount_ht = round(coalesce(nullif(amount_ht,0), amount, amount_ttc / (1 + coalesce(tva_rate,20) / 100), 0)::numeric, 2),
    amount_tva = round((coalesce(nullif(amount_ht,0), amount, 0) * coalesce(tva_rate,20) / 100)::numeric, 2),
    amount_ttc = round((coalesce(nullif(amount_ht,0), amount, 0) + (coalesce(nullif(amount_ht,0), amount, 0) * coalesce(tva_rate,20) / 100))::numeric, 2)
where true;

-- 3) Retours marchandises : HT / taux TVA / TVA récupérée/déduite / TTC
alter table if exists public.supplier_returns
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0,
  add column if not exists return_date date,
  add column if not exists supplier text,
  add column if not exists notes text;

update public.supplier_returns
set amount_ht = round(coalesce(nullif(amount_ht,0), amount, amount_ttc / (1 + coalesce(tva_rate,20) / 100), 0)::numeric, 2),
    amount_tva = round((coalesce(nullif(amount_ht,0), amount, 0) * coalesce(tva_rate,20) / 100)::numeric, 2),
    amount_ttc = round((coalesce(nullif(amount_ht,0), amount, 0) + (coalesce(nullif(amount_ht,0), amount, 0) * coalesce(tva_rate,20) / 100))::numeric, 2)
where true;

-- 4) Locations d'engins terrassement : HT / taux TVA / TVA déductible / TTC
alter table if exists public.earthwork_machine_rentals
  add column if not exists amount numeric default 0,
  add column if not exists amount_ht numeric default 0,
  add column if not exists tva_rate numeric default 20,
  add column if not exists amount_tva numeric default 0,
  add column if not exists amount_ttc numeric default 0,
  add column if not exists supplier text,
  add column if not exists notes text;

update public.earthwork_machine_rentals
set amount = round(coalesce(nullif(amount,0), rental_price, amount_ht, 0)::numeric, 2),
    amount_ht = round(coalesce(nullif(amount_ht,0), rental_price, amount, 0)::numeric, 2),
    amount_tva = round((coalesce(nullif(amount_ht,0), rental_price, amount, 0) * coalesce(tva_rate,20) / 100)::numeric, 2),
    amount_ttc = round((coalesce(nullif(amount_ht,0), rental_price, amount, 0) + (coalesce(nullif(amount_ht,0), rental_price, amount, 0) * coalesce(tva_rate,20) / 100))::numeric, 2),
    rental_price = round(coalesce(nullif(amount_ht,0), rental_price, amount, 0)::numeric, 2)
where true;

-- 5) Pointage / main d'oeuvre : colonnes de nom salarié utiles aux rapports
alter table if exists public.time_entries
  add column if not exists employee_name text,
  add column if not exists cost_estimated numeric default 0;

-- 6) Vue synthèse TVA par chantier si les tables existent.
-- La création est volontairement non bloquante : si une table n'existe pas dans ta base,
-- le reste de la migration ci-dessus reste valable.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='client_invoices') then
    execute 'drop view if exists public.v_project_tva_summary';
    execute $view$
      create view public.v_project_tva_summary as
      select
        p.id as project_id,
        coalesce(ci.tva_collectee,0) as tva_collectee,
        coalesce(pi.tva_deductible,0) + coalesce(er.tva_location_deductible,0) - coalesce(sr.tva_retours,0) as tva_deductible_nette,
        coalesce(ci.tva_collectee,0) - (coalesce(pi.tva_deductible,0) + coalesce(er.tva_location_deductible,0) - coalesce(sr.tva_retours,0)) as solde_tva
      from public.projects p
      left join (
        select project_id, round(sum(coalesce(amount_tva,0))::numeric,2) as tva_collectee
        from public.client_invoices group by project_id
      ) ci on ci.project_id = p.id
      left join (
        select project_id, round(sum(coalesce(amount_tva,0))::numeric,2) as tva_deductible
        from public.purchase_invoices group by project_id
      ) pi on pi.project_id = p.id
      left join (
        select project_id, round(sum(coalesce(amount_tva,0))::numeric,2) as tva_retours
        from public.supplier_returns group by project_id
      ) sr on sr.project_id = p.id
      left join (
        select project_id, round(sum(coalesce(amount_tva,0))::numeric,2) as tva_location_deductible
        from public.earthwork_machine_rentals group by project_id
      ) er on er.project_id = p.id;
    $view$;
  end if;
exception when others then
  raise notice 'Vue v_project_tva_summary non créée : %', SQLERRM;
end $$;
