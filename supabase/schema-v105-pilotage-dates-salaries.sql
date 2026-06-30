-- V105 - Pilotage ouvrages par date et salariés présents
-- À lancer après V104 si la table existe déjà.

alter table if exists public.chantier_work_items
  add column if not exists realization_date date,
  add column if not exists employee_ids text;

-- Compatibilité anciennes colonnes heures : elles restent présentes mais ne sont plus utilisées par l'interface V105.

create index if not exists chantier_work_items_realization_date_idx
  on public.chantier_work_items(realization_date);

create index if not exists chantier_work_items_project_date_idx
  on public.chantier_work_items(project_id, realization_date);
